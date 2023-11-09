import { dedent } from "../_util"

export const examples = [
  {
    id: 1,
    name: "Fix Grammar",
    description: "Correct grammar in the provided text",
    prompt: dedent`
      USER: Correct grammar in the following text. Do not explain.
      \`\`\`
      {{text}}
      \`\`\`{{#extra}}
      {{extra}}{{/extra}}
      ASSISTANT: Sure! Here's the corrected version without any explanation:
    `,
  },
] as any

// TODO: googlefu

// {
//   id: -2,
//   name: "Movies To Watch",
//   prompt: dedent`
//     A chat with an assistant about movies to watch.
//     USER: I need a list of movies to watch. I like {{genre}} movies. I like {{actor}} movies.
//     ASSISTANT: Here is the list of movies you should watch:
//   `,
// },

// if (NEXT) {
//   examples.push(
//     {
//       id: -5,
//       name: "Rephrase",
//       description: "",
//       prompt: dedent`
//         USER: Rephrase the following text so it looks more professional:
//         {{text}}
//         ASSISTANT:
//       `,
//     },

//     {
//       id: -6,
//       name: "Vacation Planner",
//       description: "Plan a vacation",
//       prompt: dedent`
//         USER: I need a help with planning a vacation to {{destination}}. I want to go there for {{days}} days. I want to go there in {{month}}. My budget is {{budget}} dollars. {{extra}}
//         ASSISTANT: Here is the plan for your vacation:
//       `,
//     },

//     {
//       id: -7,
//       name: "Writing Style",
//       description: "Suggest style improvements",
//       prompt: dedent`
//         USER: Given the following text, suggest improvements to the style:
//         {{text}}
//         ASSISTANT: The following improvements can be made:
//       `,
//     },

//     {
//       id: -8,
//       name: "Interview Prep",
//       description: "Prepare for an interview",
//       prompt: dedent`
//         USER: I need to prepare for an interview for a {{position}} position at {{company}}. The company industry is {{industry}}.
//         ASSISTANT: Here are the questions you should prepare for:
//       `,
//     },

//     {
//       id: -9,
//       name: "Write an E-mail",
//       description: "Write e-mail",
//       prompt: dedent`
//         USER: I need to write an e-mail to {{name}} about {{about}} because {{reason}}\nASSISTANT:
//       `,
//     },

//     {
//       id: -10,
//       name: "Write a Reply",
//       description: "Write e-mail reply",
//       prompt: dedent`
//         USER: I got this email from {{name}}:
//         {{email}}
//         Rephrase this reply in a more polite way:
//         {{reply}}
//         ASSISTANT: I think you could write something like this:
//       `,
//     },

//     {
//       id: -11,
//       name: "Summarize",
//       description: "Summarize text",
//       prompt: dedent`
//         USER: I need to summarize the following text:
//         {{text}}
//         ASSISTANT: Here is the short summary as requested:
//       `,
//     },

//     {
//       id: -12,
//       name: "Buy or Sell",
//       description: "Stock market advice",
//       prompt: dedent`
//         USER: Given the following text about a stock, should I buy or sell?
//         {{text}}
//         ASSISTANT: Based on the given text, it is difficult to provide a definitive answer. However, given that investor's risk tolerance is high, I would suggest
//       `,
//     },

//     {
//       id: -13,
//       name: "Regex Help",
//       description: "Write a regular expression",
//       prompt: dedent`
//         USER: I need a help writing regular expression in JavaScript. Specifically, I want to write regex for {{whatToMatch}}...

//         For example, the following should match:
//         {{example1}}
//         {{example2}}

//         Only answer with regex and unit-tests.

//         ASSISTANT: You can use the following regular expression:
//       `,
//     },

//     {
//       id: -14,
//       name: "Total Rewrite",
//       description: "Reimplement given code in another language",
//       prompt: dedent`
//         USER: I need to reimplement the following code in {{language}}:
//         {{code}}
//         ASSISTANT: Here is the code in {{language}}:
//       `,
//     }
//   )
// }
