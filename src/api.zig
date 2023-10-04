const std = @import("std");
const server = @import("server.zig");
const db = @import("db.zig");
const registry = @import("model_registry.zig");
const llama = @import("llama.zig");
const platform = @import("platform.zig");

pub fn @"GET /models"(ctx: *server.Context) !void {
    const models = try registry.getModels(ctx.arena);
    return ctx.sendJson(models);
}

pub fn @"DELETE /models/:id"(ctx: *server.Context, id: []const u8) !void {
    try registry.deleteModel(ctx.arena, id);
    return ctx.noContent();
}

pub fn @"POST /download"(ctx: *server.Context) !void {
    const url = try ctx.readJson([]const u8);
    inline for (.{ "Content-Type", "Content-Length", "Host", "Referer", "Origin" }) |h| {
        _ = ctx.res.request.headers.delete(h);
    }

    var client: std.http.Client = .{ .allocator = ctx.arena };
    var req = try client.request(.GET, try std.Uri.parse(url), ctx.res.request.headers, .{});
    defer req.deinit();

    try req.start();
    try req.wait();

    if (req.response.status != .ok) {
        return ctx.sendJson(.{ .@"error" = try std.fmt.allocPrint(ctx.arena, "Invalid status code: `{d}`", .{req.response.status}) });
    }

    const content_type = req.response.headers.getFirstValue("Content-Type") orelse "";
    if (!std.mem.eql(u8, content_type, "binary/octet-stream")) {
        return ctx.sendJson(.{ .@"error" = try std.fmt.allocPrint(ctx.arena, "Invalid content type: `{s}`", .{content_type}) });
    }

    var path = try std.fmt.allocPrint(ctx.arena, "{s}/{s}/{s}", .{ platform.getHome(), "Downloads", std.fs.path.basename(url) });
    var tmp_path = try std.fmt.allocPrint(ctx.arena, "{s}.part", .{path});
    var file = try std.fs.createFileAbsolute(tmp_path, .{});
    defer file.close();
    errdefer std.fs.deleteFileAbsolute(tmp_path) catch {};

    var reader = req.reader();
    var writer = file.writer();

    // connection buffer seems to be 80KB so let's do two reads per write
    var buf: [160 * 1024]u8 = undefined;
    var progress: usize = 0;
    while (reader.readAll(&buf)) |n| {
        try writer.writeAll(buf[0..n]);
        if (n < buf.len) break;

        progress += n;
        try ctx.sendJson(.{ .progress = progress });
    } else |_| return ctx.sendJson(.{ .@"error" = "Failed to download the model" });

    try std.fs.renameAbsolute(tmp_path, path);
}

pub fn @"POST /generate"(ctx: *server.Context) !void {
    const params = try ctx.readJson(struct {
        model: []const u8,
        prompt: []const u8,
        sampling: llama.SamplingParams = .{},
    });

    try ctx.sendJson(.{ .status = "Waiting for the model..." });
    var cx = llama.Pool.get(try registry.getModelPath(ctx.arena, params.model), 60_000) catch |e| {
        return ctx.sendJson(.{ .@"error" = @errorName(e) });
    };
    defer llama.Pool.release(cx);

    try ctx.sendJson(.{ .status = "Reading the history..." });
    try cx.prepare(params.prompt, params.sampling.add_bos);

    while (cx.n_past < cx.tokens.items.len) {
        try ctx.sendJson(.{ .status = try std.fmt.allocPrint(ctx.arena, "Reading the history... ({}/{})", .{ cx.n_past, cx.tokens.items.len }) });
        _ = try cx.evalOnce();
    }

    while (try cx.generate(&params.sampling)) |content| {
        try ctx.sendJson(.{ .content = content });
    }
}

pub fn @"GET /chat"(ctx: *server.Context) !void {
    var stmt = try db.query(
        \\SELECT id, name,
        \\(SELECT content FROM ChatMessage WHERE chat_id = Chat.id ORDER BY id DESC LIMIT 1) as last_message
        \\FROM Chat ORDER BY id
    , .{});
    defer stmt.deinit();

    return ctx.sendJson(stmt.iterator(struct { id: u32, name: []const u8, last_message: ?[]const u8 }));
}

pub fn @"POST /chat"(ctx: *server.Context) !void {
    const data = try ctx.readJson(struct {
        name: []const u8,
    });

    var stmt = try db.query("INSERT INTO Chat (name) VALUES (?) RETURNING *", .{data.name});
    defer stmt.deinit();

    try ctx.sendJson(try stmt.read(db.Chat));
}

pub fn @"GET /chat/:id"(ctx: *server.Context, id: u32) !void {
    var stmt = try db.query("SELECT * FROM Chat WHERE id = ?", .{id});
    defer stmt.deinit();

    return ctx.sendJson(try stmt.read(db.Chat));
}

pub fn @"PUT /chat/:id"(ctx: *server.Context, id: u32) !void {
    const data = try ctx.readJson(struct {
        name: []const u8,
    });

    try db.exec("UPDATE Chat SET name = ? WHERE id = ?", .{ data.name, id });
    return ctx.noContent();
}

pub fn @"GET /chat/:id/messages"(ctx: *server.Context, id: u32) !void {
    var stmt = try db.query("SELECT * FROM ChatMessage WHERE chat_id = ? ORDER BY id", .{id});
    defer stmt.deinit();

    return ctx.sendJson(stmt.iterator(db.ChatMessage));
}

pub fn @"POST /chat/:id/messages"(ctx: *server.Context, id: u32) !void {
    const data = try ctx.readJson(struct {
        role: []const u8,
        content: []const u8,
    });

    var stmt = try db.query("INSERT INTO ChatMessage (chat_id, role, content) VALUES (?, ?, ?) RETURNING *", .{ id, data.role, data.content });
    defer stmt.deinit();

    try ctx.sendJson(try stmt.read(db.ChatMessage));
}

pub fn @"GET /chat/:id/messages/:message_id"(ctx: *server.Context, id: u32, message_id: u32) !void {
    var stmt = try db.query("SELECT * FROM ChatMessage WHERE id = ? AND chat_id = ?", .{ message_id, id });
    defer stmt.deinit();

    return ctx.sendJson(try stmt.read(db.ChatMessage));
}

pub fn @"PUT /chat/:id/messages/:message_id"(ctx: *server.Context, id: u32, message_id: u32) !void {
    const data = try ctx.readJson(struct {
        role: []const u8,
        content: []const u8,
    });

    try db.exec("UPDATE ChatMessage SET role = ?, content = ? WHERE id = ? AND chat_id = ?", .{ data.role, data.content, message_id, id });
    return ctx.noContent();
}

pub fn @"DELETE /chat/:id/messages/:message_id"(ctx: *server.Context, id: u32, message_id: u32) !void {
    try db.exec("DELETE FROM ChatMessage WHERE id = ? AND chat_id = ?", .{ message_id, id });
    return ctx.noContent();
}

pub fn @"DELETE /chat/:id"(ctx: *server.Context, id: u32) !void {
    try db.exec("DELETE FROM Chat WHERE id = ?", .{id});
    return ctx.noContent();
}

pub fn @"GET /prompts"(ctx: *server.Context) !void {
    var stmt = try db.query("SELECT * FROM Prompt ORDER BY id", .{});
    defer stmt.deinit();

    return ctx.sendJson(stmt.iterator(db.Prompt));
}

pub fn @"POST /prompts"(ctx: *server.Context) !void {
    const data = try ctx.readJson(struct {
        name: []const u8,
        prompt: []const u8,
    });

    var stmt = try db.query("INSERT INTO Prompt (name, prompt) VALUES (?, ?) RETURNING *", .{ data.name, data.prompt });
    defer stmt.deinit();

    try ctx.sendJson(try stmt.read(db.Prompt));
}

pub fn @"DELETE /prompts/:id"(ctx: *server.Context, id: u32) !void {
    try db.exec("DELETE FROM Prompt WHERE id = ?", .{id});
    return ctx.noContent();
}
