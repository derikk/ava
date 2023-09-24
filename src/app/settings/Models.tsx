import { useSignal } from "@preact/signals"
import { Alert, Button, Link, Modal, Table } from "../_components"
import { SettingsPage } from "./SettingsPage"
import { useApi } from "../_hooks"
import { jsonLines } from "../_util"

const catalog = [
  {
    url: "https://huggingface.co/TheBloke/WizardLM-13B-V1.2-GGUF/resolve/main/wizardlm-13b-v1.2.Q4_K_M.gguf",
    size: 7865956224,
  },
  {
    url: "https://huggingface.co/TheBloke/Airoboros-L2-7B-2.2-GGUF/resolve/main/airoboros-l2-7b-2.2.Q4_K_M.gguf",
    size: 4081004256,
  },
  {
    url: "https://huggingface.co/NikolayKozloff/falcon-7b-GGUF/resolve/main/falcon-7b-Q4_0-GGUF.gguf",
    size: 4062813440,
  },
  {
    url: "https://huggingface.co/Aryanne/Mamba-gpt-3B-v4-ggml-and-gguf/resolve/main/q4_0-gguf-mamba-gpt-3B_v4.gguf",
    size: 1979924096,
  },
  {
    url: "https://huggingface.co/klosax/tinyllamas-stories-gguf/resolve/main/tinyllamas-stories-15m-f32.gguf",
    size: 98229216,
  },
]

export const Models = () => {
  const { data: models = [], refetch, del } = useApi("models")
  const progress = useSignal(null)
  const ctrl = useSignal(null)

  const download = async ({ url, size }) => {
    progress.value = { url, size, progress: 0 }
    ctrl.value = new AbortController()

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        body: JSON.stringify(url),
        signal: ctrl.value.signal,
      })

      for await (const d of jsonLines(res.body.getReader())) {
        if ("error" in d) {
          throw new Error(`Unexpected error: ${d.error}`)
        }

        progress.value = { ...progress.value, ...d }
      }

      await refetch()
    } catch (e) {
      if (e.code !== DOMException.ABORT_ERR) {
        throw e
      }
    } finally {
      progress.value = null
    }
  }

  const cancel = () => {
    progress.value = null
    ctrl.value?.abort()
  }

  return (
    <SettingsPage>
      {progress.value && <ProgressModal {...progress.value} onCancel={cancel} />}

      <Alert>
        <strong>This page is under construction.</strong> <br />
        For now, the models are searched in and downloaded to your Downloads folder. <br />
        <br />
        You can download one of the models below, or you can find more models on the Wiki page below. <br />
        <br />
        <Button href="https://www.reddit.com/r/LocalLLaMA/wiki/models/">Open LocallLama Reddit</Button>
      </Alert>

      <h2 class="mt-10 mb-2 text-xl">Installed models</h2>
      <Table class="max-w-5xl">
        <thead>
          <tr>
            <th>Model</th>
            <th class="w-24 text-right">Size</th>
            <th class="w-32"></th>
          </tr>
        </thead>
        <tbody>
          {!models.length && (
            <tr>
              <td colSpan={3}>No models installed. Download one from the catalog below.</td>
            </tr>
          )}

          {models.map(m => (
            <tr>
              <td class="capitalize">{m.name}</td>
              <td class="text-right">{humanSize(m.size)}</td>
              <td class="text-center">
                <Button onClick={() => del(m.name)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h2 class="mt-10 mb-2 text-xl">Catalog</h2>
      <Table class="max-w-5xl">
        <thead>
          <tr>
            <th>Model</th>
            <th>Uploader</th>
            <th class="w-24 text-right">Size</th>
            <th class="w-32"></th>
          </tr>
        </thead>
        <tbody>
          {catalog.map(m => (
            <tr>
              <td class="capitalize">{basename(m.url.slice(0, -5))}</td>
              <td>{m.url.split("/")[3]}</td>
              <td class="text-right">{humanSize(m.size)}</td>
              <td class="text-center">
                {models.find(({ name }) => name === basename(m.url).slice(0, -5)) ? (
                  <strong class="text-green-10">Installed</strong>
                ) : (
                  <Button onClick={() => download(m)}>Download</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <p class="mt-4">
        <strong>
          Different models may have different licenses. Always check the license of each model before using it.
        </strong>
      </p>
    </SettingsPage>
  )
}

const ProgressModal = ({ url, size, progress, onCancel }) => {
  const percent = (progress / size) * 100

  return (
    <Modal class="w-[30rem]" title={`Download in Progress`} onClose={onCancel}>
      <div class="flex justify-between">
        <span>Downloading {basename(url)}</span>
        <span>{percent.toFixed(2)}%</span>
      </div>

      <div class="mt-4 h-1 w-full bg-neutral-7">
        <div class="h-1 bg-blue-9" style={`width: ${percent}%`}></div>
      </div>

      <div class="mt-4 flex justify-between">
        <span>
          {humanSize(progress)} / {humanSize(size)}
        </span>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  )
}

const basename = url => url.split("/").pop()

const humanSize = size => {
  switch (true) {
    case size / 1024 < 1:
      return `${size} B`
    case size / 1024 / 1024 < 1:
      return `${(size / 1024).toFixed(2)} KB`
    case size / 1024 / 1024 / 1024 < 1:
      return `${(size / 1024 / 1024).toFixed(2)} MB`
    default:
      return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
  }
}
