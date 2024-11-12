'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bold, Italic, Underline, List, Image as ImageIcon, Link, Table, FileDown, Code, Quote, Heading1, Heading2, Heading3, CheckSquare, Strikethrough, Moon, Sun, Loader2 } from 'lucide-react'
import { saveAs } from 'file-saver'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'
import { usePDF } from 'react-to-pdf'
import rehypeRaw from 'rehype-raw'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth, SignIn, SignUp, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/components/theme-provider"
import { dark, neobrutalism, shadesOfPurple } from "@clerk/themes";

type CodeProps = {
  inline?: boolean;
  className?: string;
  children: string | string[];
  [key: string]: unknown;
};

type ClerkAppearance = {
  baseTheme?: 'dark' | 'light';
  elements?: {
    card?: string;
    rootBox?: string;
    formButtonPrimary?: string;
    [key: string]: any;
  };
};

export function MarkdownEditor() {
  const [content, setContent] = useState(`# Welcome to the Markdown Editor

This editor supports GitHub-flavored markdown.

## Features

### Text Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough~~

### Lists
1. Numbered list
2. With multiple items

- Bullet points
- Another point

### Code
\`\`\`javascript
function hello() {
  console.log("Hello world!");
}
\`\`\`

### Tables
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`)
  const [tab, setTab] = useState('write')
  const [darkMode, setDarkMode] = useState(false)
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isWordExporting, setIsWordExporting] = useState(false)
  const [isHtmlExporting, setIsHtmlExporting] = useState(false)
  const { toPDF, targetRef } = usePDF({filename: 'markdown-document.pdf'})
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const { isLoaded, isSignedIn } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { toast } = useToast()
  const { theme } = useTheme()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const insertAtCursor = (before: string, after = '') => {
    const textarea = document.querySelector('textarea')
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)
    
    const newText = 
      text.substring(0, start) + 
      before + 
      (selectedText || (before === '\n---\n' ? '' : 'text')) + 
      after + 
      text.substring(end)
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + before.length + (selectedText || (before === '\n---\n' ? '' : 'text')).length + after.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const handlePdfExport = async () => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    
    try {
      if (isDarkMode) {
        document.documentElement.classList.remove('dark')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await toPDF()
      
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
    } catch (error) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      }
      throw error
    }
  }

  const handleExport = async (type: 'PDF' | 'Word' | 'HTML') => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setShowAuthDialog(true);
      return;
    }

    if (tab !== 'preview') {
      setDialogMessage(`Please switch to the Preview tab before exporting to ${type}.`)
      setShowDialog(true)
      return
    }

    try {
      switch (type) {
        case 'PDF':
          setIsPdfExporting(true)
          await handlePdfExport()
          break
        case 'Word':
          setIsWordExporting(true)
          await exportToWord()
          break
        case 'HTML':
          setIsHtmlExporting(true)
          await exportToHtml()
          break
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
    } finally {
      setIsPdfExporting(false)
      setIsWordExporting(false)
      setIsHtmlExporting(false)
    }
  }

  const exportToPDF = async () => {
    try {
      await toPDF()
      console.log("PDF exported successfully")
    } catch (error) {
      throw error
    }
  }

  const exportToWord = async () => {
    try {
      const previewContent = document.querySelector('.prose')?.innerHTML
      if (!previewContent) {
        throw new Error('Preview content not found')
      }

      // Create a Blob with the correct MIME type for Word
      const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="boundary-example"

--boundary-example
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  h1 { font-size: 24pt; border-bottom: 1pt solid #eee; padding-bottom: 6pt; }
  h2 { font-size: 18pt; border-bottom: 1pt solid #eee; padding-bottom: 6pt; }
  h3 { font-size: 14pt; }
  pre { background-color: #f6f8fa; padding: 12pt; margin: 12pt 0; }
  code { font-family: 'Courier New', monospace; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1pt solid #ddd; padding: 8pt; }
  th { background-color: #f6f8fa; }
  blockquote { border-left: 4pt solid #ddd; margin: 0; padding: 0 12pt; }
</style>
</head>
<body>
${previewContent}
</body>
</html>

--boundary-example--`

      const blob = new Blob([mhtml], {
        type: 'application/vnd.ms-word;charset=utf-8'
      })
      
      await saveAs(blob, 'markdown-document.doc')

      console.log("Word document exported successfully")
    } catch (error) {
      throw error
    }
  }

  const exportToHtml = async () => {
    try {
      const previewContent = document.querySelector('.prose')?.innerHTML
      if (!previewContent) {
        throw new Error('Preview content not found')
      }

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.5;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
    code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f6f8fa; }
    blockquote { margin: 0; padding-left: 1em; border-left: 0.25em solid #ddd; color: #666; }
  </style>
</head>
<body>
  ${previewContent}
</body>
</html>`

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      await saveAs(blob, 'markdown-export.html')

      console.log("HTML exported successfully")
    } catch (error) {
      throw error
    }
  }

  const handleSignInSuccess = () => {
    setShowAuthDialog(false)
    toast({
      title: "Success",
      description: "Successfully signed in!",
      duration: 3000,
    })
  }

  return (
    <div className="container mx-auto p-2 sm:p-6 dark:bg-gray-900 dark:text-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-4"
      >
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Markdown Editor</h1>
            <div className="flex items-center gap-2">
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <UserButton afterSignOutUrl={window?.location?.href} />
                  ) : (
                    <>
                      <SignInButton mode="modal">
                        <Button variant="outline" size="sm">
                          Sign in
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button variant="outline" size="sm">
                          Sign up
                        </Button>
                      </SignUpButton>
                    </>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="ml-2"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('PDF')}
              disabled={isPdfExporting}
              className="w-full sm:w-auto"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                  <span className="sm:hidden">PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('Word')}
              disabled={isWordExporting}
              className="w-full sm:w-auto"
            >
              {isWordExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                  <span className="sm:hidden">Word...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export Word</span>
                  <span className="sm:hidden">Word</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('HTML')}
              disabled={isHtmlExporting}
              className="w-full sm:w-auto"
            >
              {isHtmlExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                  <span className="sm:hidden">HTML...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export HTML</span>
                  <span className="sm:hidden">HTML</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <motion.div 
          layout
          className="bg-card rounded-lg shadow-lg overflow-hidden"
        >
          <div className="border-b pb-2 overflow-x-auto">
            <div className="flex items-center gap-2 p-2 min-w-max">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('**', '**')}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('*', '*')}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('<u>', '</u>')}
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('~~', '~~')}
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('\n- ')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('# ')}
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('## ')}
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('### ')}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('> ')}
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('`', '`')}
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('- [ ] ')}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('\n---\n')}
              >
                <span className="h-4 w-4 flex items-center justify-center font-mono">--</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Insert Image</h4>
                    <div className="space-y-2">
                      <Label htmlFor="image-url">Image URL</Label>
                      <Input id="image-url" placeholder="https://example.com/image.jpg" />
                    </div>
                    <Button 
                      onClick={() => {
                        const url = (document.getElementById('image-url') as HTMLInputElement)?.value
                        if (url) insertAtCursor(`![Image](${url})`)
                      }}
                      className="w-full"
                    >
                      Insert
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Link className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Insert Link</h4>
                    <div className="space-y-2">
                      <Label htmlFor="link-text">Link Text</Label>
                      <Input id="link-text" placeholder="Link text" />
                      <Label htmlFor="link-url">URL</Label>
                      <Input id="link-url" placeholder="https://example.com" />
                    </div>
                    <Button 
                      onClick={() => {
                        const text = (document.getElementById('link-text') as HTMLInputElement)?.value
                        const url = (document.getElementById('link-url') as HTMLInputElement)?.value
                        if (text && url) insertAtCursor(`[${text}](${url})`)
                      }}
                      className="w-full"
                    >
                      Insert
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => insertAtCursor('\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n')}
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="min-h-[600px] pt-2">
            <div className="border-b px-4 pb-2">
              <TabsList className="border-0 bg-muted">
                <TabsTrigger 
                  value="write" 
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                >
                  Write
                </TabsTrigger>
                <TabsTrigger 
                  value="preview" 
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                >
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>
            
            <AnimatePresence mode="wait">
              <TabsContent value="write" className="m-0 p-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[600px] p-4 font-mono text-sm bg-background dark:bg-gray-800 dark:text-white resize-none focus:outline-none"
                    placeholder="Start writing..."
                  />
                </motion.div>
              </TabsContent>
              
              <TabsContent value="preview" className="m-0 p-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full min-h-[600px] p-4"
                  ref={targetRef}
                >
                  <article className="prose prose-slate max-w-none dark:prose-invert print:max-w-none
                    prose-h1:text-3xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-4 prose-h1:mb-4
                    prose-h2:text-2xl prose-h2:font-bold prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-3 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:font-bold prose-h3:mb-4
                    prose-p:my-4 prose-p:leading-7
                    prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:my-4
                    prose-ul:my-4 prose-ul:pl-5 
                    prose-ol:my-4 prose-ol:pl-5
                    prose-li:my-2 prose-li:leading-7
                    prose-table:border-collapse prose-table:w-full prose-table:my-4
                    prose-td:border prose-td:p-2 prose-td:border-gray-300
                    prose-th:border prose-th:p-2 prose-th:border-gray-300 prose-th:bg-gray-100"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code: function Code({ inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return inline ? (
                            <code className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 text-sm" {...props}>
                              {children}
                            </code>
                          ) : match ? (
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg !bg-gray-100 dark:!bg-gray-800 my-4 text-sm"
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="block bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm" {...props}>
                              {children}
                            </code>
                          )
                        },
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 mt-8">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-bold mb-4 mt-6">
                            {children}
                          </h3>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto -mx-4 sm:mx-0 my-4">
                            <div className="min-w-max px-4 sm:px-0">
                              <table className="min-w-full border border-gray-300 dark:border-gray-700">
                                {children}
                              </table>
                            </div>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                            {children}
                          </td>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 my-4 [&>li]:relative [&>li]:leading-7">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 my-4 [&>li]:relative [&>li]:leading-7">
                            {children}
                          </ol>
                        ),
                        li: ({ children, ...props }) => (
                          <li className="relative my-2 leading-7 marker:text-gray-500" {...props}>
                            <span className="inline-block">{children}</span>
                          </li>
                        ),
                        del: ({ children }) => (
                          <del className="inline-block align-middle line-through">{children}</del>
                        ),
                        u: ({ children }) => (
                          <u className="underline">{children}</u>
                        )
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </article>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </motion.div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to Preview</DialogTitle>
            <DialogDescription>
              {dialogMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] w-[95%] p-0 sm:p-6">
          <DialogHeader className="text-center p-4 sm:p-0">
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              Please sign in to export your document.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center mt-4 w-full overflow-hidden">
            <SignIn 
              afterSignInUrl={window?.location?.href} 
              appearance={{
                elements: {
                  card: "mx-auto w-full sm:w-auto px-4 sm:px-0",
                  rootBox: "w-full",
                  formButtonPrimary: "mx-auto",
                  footerAction: "mx-auto flex flex-col sm:flex-row gap-2 items-center",
                  formFieldInput: "max-w-full",
                  formField: "max-w-full",
                  form: "w-full",
                  socialButtons: "w-full",
                  socialButtonsBlockButton: "w-full",
                  dividerRow: "w-full",
                  formFieldRow: "w-full"
                }
              }}
              signUpUrl="/sign-up"
              redirectUrl={window?.location?.href}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}