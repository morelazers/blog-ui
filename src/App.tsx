import { marked } from 'marked'
import MDEditor from '@uiw/react-md-editor'
import { Urbit } from '@urbit/http-api'
import { defaultString } from './lib'
import React, { useState, useEffect, useCallback } from 'react'
import Published from './components/BlogList'
import Drafts from './components/DraftsList'
import ThemeSelector from './components/ThemeSelector'
import Modal from './components/Modal'

function App() {
  // api
  const [api, setApi] = useState<Urbit>()
  // inputs
  const [fileName, setFileName] = useState('')
  const [markdown, setMarkdown] = useState(defaultString)
  // scries
  const [published, setPublished] = useState<string[]>([])
  const [drafts, setDrafts]       = useState<string[]>([])
  const [themes, setThemes]       = useState<string[]>([])
  const [bindings, setBindings]   = useState<any>()
  // frontend state
  const [theme, setTheme]                 = useState('default')
  const [rescry, setRescry]               = useState<any>()
  const [themeCss, setThemeCss]           = useState('')
  const [showPreview, setShowPreview]     = useState(false)
  const [disableSave, setDisableSave]     = useState(true)
  const [fileNameError, setFileNameError] = useState('')
  const [justPublished, setJustPublished] = useState('')
  
  // api
  useEffect(() => {
    const getApi = async () => {
      // const api = new Urbit('')
      // api.ship = (window as any).ship as string
      // (window as any).api = api
      const api = await Urbit.authenticate({
        ship : 'zod',
        url: 'http://localhost:80',
        code: 'lidlut-tabwed-pillex-ridrup',
        verbose: true
      })
      setApi(api)
    }
    getApi()
  }, [])

  // scries
  useEffect(() => {
    if (!api) return
    const getBindings = async () => {
      let res = await api.scry({app: 'blog', path: '/all-bindings'})
      setBindings(res)
    }
    const getDrafts = async () => {
      let res = await api.scry({app: 'blog', path: '/drafts'})
      setDrafts(res)
    }
    const getPublished = async () => {
      let res = await api.scry({app: 'blog', path: '/pages'})
      setPublished(res)
    }
    const getThemes = async() => {
      let res = await api.scry({app: 'blog', path: '/themes'})
      setThemes(res)
    }
    getBindings()
    getDrafts()
    getPublished()
    getThemes()
  }, [api, rescry])

  // frontend state
  useEffect(() => {
    if (fileName.charAt(fileName.length - 1) === '/') {
      setFileNameError(`cannot end in a slash`)
      setDisableSave(true)
    } else if (fileName.charAt(0) !== '/'){
      setFileNameError(`must start with a slash`)
      setDisableSave(true)
    } else if (bindings?.[fileName]) {
      const inUse = bindings[fileName]
      if (inUse === 'desk: %blog') {
        setFileNameError(`you will overwrite ${fileName}`)
        setDisableSave(false)
      } else {
        setFileNameError(`${fileName} is in use by ${inUse}`)
        setDisableSave(true)
      }
    } else {
      setFileNameError('')
      setDisableSave(false)
    }
  }, [fileName, bindings])


  // callbacks
  const handlePublish = useCallback(
    async (e : React.SyntheticEvent) => {
      e.preventDefault()
      if (!api) {
        console.error('api not connected')
        return
      }
      const a = await api.poke({
        app: 'blog',
        mark: 'blog-action',
        json: {
          "publish": {
            "path": fileName,
            "html": marked.parse(markdown),
            "md": markdown,
            "theme": theme
      }}})
      setRescry(a)
      setDisableSave(true)
      setJustPublished(`${window.location.origin}${fileName}`)
  }, [api, fileName, markdown, theme])


  const handleSaveDraft = useCallback(
    async (e : React.SyntheticEvent) => {
      e.preventDefault()
      if (!api) {
        console.error('api not connected')
        return
      }
      const a = await api.poke({
        app: 'blog',
        mark: 'blog-action',
        json: {
          "save-draft": {
            "path": fileName,
            "md": markdown
      }}})
      setRescry(a)
      setDisableSave(true)
  }, [api, fileName, markdown])

  const handleDeleteDraft = useCallback(
    async (toDelete: string) => {
      if (!api) {
        console.error('api not connected')
        return
      }
      const a = await api.poke({
        app: 'blog',
        mark: 'blog-action',
        json: {
          "delete-draft": {
            "path": toDelete,
      }}})
      setRescry(a)
      setDisableSave(true)
  }, [api])

  const handleUnpublish = useCallback(
    async (toUnpublish: string) => {
      if (!api) {
        console.error('api not connected')
        return
      }
      const a = await api.poke({
        app: 'blog',
        mark: 'blog-action',
        json: { 'unpublish': { 'path': toUnpublish } }
      })
      setRescry(a)
  }, [api])

  const handleEdit = useCallback(
    async (path: string, toEdit: string) => {
      if (!api) {
        console.error('api not connected')
        return
      }
      const res = await api.scry({
        app: 'blog',
        path: `${path}${toEdit}` // path is either /draft or /md
      })
      setFileName(toEdit)
      setMarkdown(res)
    }, [api])

  return (
    <div className="grid grid-rows-1 lg:grid-cols-12 md:grid-cols-1 gap-4">
      <div className="col-span-9 shadow-md flex">
        <MDEditor
            value={markdown}
            onChange={(e) => {setDisableSave(false); setMarkdown(e!)}}
            data-color-mode="light"
            preview="edit"
            hideToolbar
            className={`${showPreview? 'flex-1' : 'flex-2'}`}
        />
        { showPreview && 
          <iframe
            title="preview"
            srcDoc={`${marked.parse(markdown)}`}
            className="flex-1"
          />
        }
      </div>
      <div className="col-span-3">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Name as <code>$path</code>:</label>
            <code>
              <input
                className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none"
                placeholder="/example/path"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                pattern="^\/.+(?!\/)"
                required
              />
            </code>
            {
              fileNameError &&
              <p className="text-red-500 text-xs italic mt-1">{fileNameError}</p>
            }
            <label className="block text-gray-700 font-bold mb-2 mt-3"><code>%theme</code>:</label>
            <ThemeSelector themes={themes} theme={theme} setTheme={setTheme} />
          </div>
          <div className="flex text-xs gap-x-2">
            <button
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded w-full" // TODO disbaled:something
              disabled={disableSave || !fileName}
              onClick={handleSaveDraft}
            >
              <code>%save-draft</code>
            </button>
            <button
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded w-full" // TODO disbaled:something
              disabled={disableSave || !fileName}
              onClick={handlePublish}
            >
              <code>%publish</code>
            </button>
          </div>
        </div>
        <Published published={published} edit={handleEdit} remove={handleUnpublish}/>
        <Drafts drafts={drafts} edit={handleEdit} remove={handleDeleteDraft}/>
        <label>
          <input
            type="checkbox"
            checked={showPreview}
            onChange={() => setShowPreview(!showPreview)}
          />
          <code className="ml-2">%show-preview</code>
        </label>
      </div>
      { justPublished.length !== 0 && <Modal justPublished={justPublished} setJustPublished={setJustPublished}/> }
    </div>
  );
}

export default App
