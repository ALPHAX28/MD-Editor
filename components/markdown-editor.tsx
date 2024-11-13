'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bold, Italic, Underline, List, Image as ImageIcon, Link as LinkIcon, Table, FileDown, Code, Quote, Heading1, Heading2, Heading3, CheckSquare, Strikethrough, Moon, Sun, Loader2, Copy, Check, Menu } from 'lucide-react'
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
import { useAuth, SignIn, SignUp, UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/components/theme-provider"
import { dark, neobrutalism, shadesOfPurple } from "@clerk/themes";
import NextLink from 'next/link'
import { useAutosave } from '@/hooks/use-autosave'
import { SaveStatusIndicator } from "@/components/save-status"
import { DocumentSidebar } from "@/components/document-sidebar"
import { Document } from "@/types"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DocumentLoading } from "@/components/document-loading"

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: any;
  style?: any;
}

type ClerkAppearance = {
  baseTheme?: 'dark' | 'light';
  elements?: {
    card?: string;
    rootBox?: string;
    formButtonPrimary?: string;
    [key: string]: any;
  };
};

export function MarkdownEditor({ documentId }: { documentId?: string }) {
  const [tab, setTab] = useState('write')
  const [darkMode, setDarkMode] = useState(false)
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isWordExporting, setIsWordExporting] = useState(false)
  const [isHtmlExporting, setIsHtmlExporting] = useState(false)
  const { toPDF, targetRef } = usePDF({filename: 'markdown-document.pdf'})
  const [showDialog, setShowDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { toast } = useToast()
  const { theme } = useTheme()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string>()
  
  const { 
    content, 
    setContent, 
    lastSaved, 
    saveStatus,
    loadStatus 
  } = useAutosave(documentId)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (isSignedIn) {
      fetchDocuments()
    }
  }, [isSignedIn])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

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

  const handleDocumentSelect = async (documentId: string) => {
    try {
      if (activeDocumentId === documentId) return;
      
      // Save current document before switching if there's unsaved content
      if (activeDocumentId && content) {
        await fetch(`/api/documents/${activeDocumentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });
      }
      
      // Set new active document
      setActiveDocumentId(documentId);
      
      // Fetch the selected document
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to load document');
      
      const document = await response.json();
      
      // Update content state with the fetched document's content
      setContent(document.content || '');
      
      toast({
        title: "Document loaded",
        description: "Successfully loaded document",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error selecting document:', error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleNewDocument = async (title: string) => {
    if (!isSignedIn) return;
    
    try {
      const response = await fetch('/api/documents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: title || 'Untitled Document',
          content: ''
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }
      
      const newDoc = await response.json();
      
      // Update documents list with the new document
      setDocuments(prev => [...prev, { ...newDoc, title: title || 'Untitled Document' }]);
      setActiveDocumentId(newDoc.id);
      setContent('');
      
      toast({
        title: "Success",
        description: `Created "${title || 'Untitled Document'}"!`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleRenameDocument = async (documentId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      })
      
      if (!response.ok) throw new Error('Failed to rename document')
      
      const updatedDoc = await response.json()
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, title: newTitle } : doc
      ))
      
      toast({
        title: "Success",
        description: "Document renamed successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error renaming document:', error)
      toast({
        title: "Error",
        description: "Failed to rename document",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete document')
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      if (activeDocumentId === documentId) {
        setActiveDocumentId(undefined)
        setContent('')
      }
      
      toast({
        title: "Success",
        description: "Document deleted successfully",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const CodeBlock = ({ children, className, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false)
    const textContent = String(children).replace(/\n$/, '')
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(textContent)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }

    const match = /language-(\w+)/.exec(className || '')
    const lang = match ? match[1] : ''

    if (props.inline) {
      return <code className={className} {...props}>{children}</code>
    }

    return (
      <div className="group relative">
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/50 backdrop-blur-sm"
            onClick={copyToClipboard}
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <SyntaxHighlighter
          style={tomorrow}
          language={lang || 'text'}
          PreTag="div"
          {...props}
        >
          {textContent}
        </SyntaxHighlighter>
      </div>
    )
  }

  useEffect(() => {
    if (!activeDocumentId || !content) return;

    const saveDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${activeDocumentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) throw new Error('Failed to save document');
        
        // Update the documents list with the new content
        setDocuments(prev => prev.map(doc => 
          doc.id === activeDocumentId 
            ? { ...doc, content } 
            : doc
        ));
      } catch (error) {
        console.error('Error saving document:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveDocument, 1000);
    return () => clearTimeout(timeoutId);
  }, [content, activeDocumentId]);

  // Add this helper function to get current document title
  const getCurrentDocumentTitle = () => {
    if (!activeDocumentId) return "Untitled";
    const currentDoc = documents.find(doc => doc.id === activeDocumentId);
    return currentDoc?.title || "Untitled";
  };

  return (
    <div className="relative h-full">
      <DocumentLoading status={loadStatus} />
      <div className="flex h-screen overflow-hidden">
        <DocumentSidebar
          documents={documents}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={handleDocumentSelect}
          onNewDocument={handleNewDocument}
          onDeleteDocument={handleDeleteDocument}
          onRenameDocument={handleRenameDocument}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSheetOpen={isSheetOpen}
          onSheetOpenChange={setIsSheetOpen}
        />
        <div className="flex-1 flex flex-col w-full overflow-hidden">
          <div className="container mx-auto px-2 sm:px-6 py-2 sm:py-6 dark:bg-gray-900 dark:text-white min-h-screen overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-4"
            >
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                  {/* Mobile Hamburger and Welcome Message */}
                  <div className="flex items-center gap-4">
                    <div className="sm:hidden">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Menu className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                      </Sheet>
                    </div>
                    <NextLink href="/" className="hover:opacity-80 transition-opacity">
                      <h1 className="text-xl sm:text-2xl font-bold cursor-pointer truncate">
                        {isLoaded && (
                          isSignedIn ? (
                            <>Welcome {user?.firstName || user?.username}</>
                          ) : (
                            <>Welcome Guest</>
                          )
                        )}
                      </h1>
                    </NextLink>
                  </div>

                  {/* User Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isLoaded && (
                      <>
                        {isSignedIn ? (
                          <UserButton 
                            afterSignOutUrl={`${window?.location?.pathname}?reload=true`}
                          />
                        ) : (
                          <div className="hidden sm:flex gap-2">
                            <SignInButton mode="modal" afterSignInUrl={window?.location?.pathname}>
                              <Button variant="outline" size="sm">
                                Sign in
                              </Button>
                            </SignInButton>
                            <SignUpButton mode="modal" afterSignUpUrl={window?.location?.pathname}>
                              <Button variant="outline" size="sm">
                                Sign up
                              </Button>
                            </SignUpButton>
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDarkMode(!darkMode)}
                    >
                      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Mobile Sign In/Up Buttons */}
                {isLoaded && !isSignedIn && (
                  <div className="flex sm:hidden gap-2 w-full">
                    <SignInButton mode="modal" afterSignInUrl={window?.location?.pathname}>
                      <Button variant="outline" size="sm" className="flex-1">
                        Sign in
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal" afterSignUpUrl={window?.location?.pathname}>
                      <Button variant="outline" size="sm" className="flex-1">
                        Sign up
                      </Button>
                    </SignUpButton>
                  </div>
                )}

                {/* Export Buttons */}
                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleExport('PDF')}
                    disabled={isPdfExporting}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {isPdfExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="sm:inline">PDF</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('Word')}
                    disabled={isWordExporting}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {isWordExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="sm:inline">Word</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export Word</span>
                        <span className="sm:hidden">Word</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('HTML')}
                    disabled={isHtmlExporting}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {isHtmlExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="sm:inline">HTML</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 sm:mr-2" />
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
                  <div className="flex items-center gap-1 sm:gap-2 p-2 min-w-max">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('**', '**')}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('*', '*')}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('<u>', '</u>')}
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('~~', '~~')}
                      title="Strikethrough"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n- ')}
                      title="List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('# ')}
                      title="Heading 1"
                    >
                      <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('## ')}
                      title="Heading 2"
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('### ')}
                      title="Heading 3"
                    >
                      <Heading3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('> ')}
                      title="Quote"
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('`', '`')}
                      title="Code"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('- [ ] ')}
                      title="Task List"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => insertAtCursor('\n---\n')}
                      title="Horizontal Rule"
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
                          <LinkIcon className="h-4 w-4" />
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

                <Tabs value={tab} onValueChange={setTab} className="min-h-[300px] sm:min-h-[600px] pt-2 relative">
                  <div className="border-b px-4 pb-2 flex items-center">
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
                    <div className="flex-1 flex justify-center">
                      <span className="text-sm text-muted-foreground font-medium">
                        {getCurrentDocumentTitle()}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <SaveStatusIndicator status={saveStatus} />
                    </div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    <TabsContent key="write" value="write" className="m-0 p-0">
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
                    
                    <TabsContent key="preview" value="preview" className="m-0 p-0">
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
                          prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800
                          prose-code:text-gray-800 dark:prose-code:text-gray-200
                          prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                          prose-code:rounded prose-code:px-1 prose-code:py-0.5
                          prose-ul:list-disc prose-ol:list-decimal
                          prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                          prose-table:border-collapse prose-td:border prose-th:border
                          prose-img:rounded-lg"
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              code: CodeBlock,
                              h1: ({children, ...props}) => (
                                <h1 className="text-3xl font-bold border-b border-gray-200 pb-4 mb-4" {...props}>
                                  {children}
                                </h1>
                              ),
                              h2: ({children, ...props}) => (
                                <h2 className="text-2xl font-bold border-b border-gray-200 pb-3 mb-4" {...props}>
                                  {children}
                                </h2>
                              ),
                              h3: ({children, ...props}) => (
                                <h3 className="text-xl font-bold mb-3" {...props}>{children}</h3>
                              ),
                              ul: ({children, ...props}) => (
                                <ul className="list-disc pl-6 mb-4 space-y-2" {...props}>{children}</ul>
                              ),
                              ol: ({children, ...props}) => (
                                <ol className="list-decimal pl-6 mb-4 space-y-2" {...props}>{children}</ol>
                              ),
                              li: ({children, ...props}) => (
                                <li className="mb-1" {...props}>{children}</li>
                              ),
                              blockquote: ({children, ...props}) => (
                                <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800" {...props}>
                                  {children}
                                </blockquote>
                              ),
                              table: ({children, ...props}) => (
                                <div className="overflow-x-auto my-4">
                                  <table className="min-w-full border-collapse" {...props}>{children}</table>
                                </div>
                              ),
                              th: ({children, ...props}) => (
                                <th className="border px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold" {...props}>
                                  {children}
                                </th>
                              ),
                              td: ({children, ...props}) => (
                                <td className="border px-4 py-2" {...props}>{children}</td>
                              ),
                              a: ({children, href, ...props}) => (
                                <a 
                                  href={href}
                                  className="text-blue-500 hover:text-blue-600 underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  {...props}
                                >
                                  {children}
                                </a>
                              ),
                              img: ({src, alt, ...props}) => (
                                <img
                                  src={src}
                                  alt={alt}
                                  className="max-w-full h-auto rounded-lg my-4"
                                  {...props}
                                />
                              ),
                              hr: (props) => (
                                <hr className="my-8 border-t border-gray-300 dark:border-gray-600" {...props} />
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
          </div>
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
            <DialogContent className="sm:max-w-[480px] p-0 bg-background">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-center">Authentication Required</DialogTitle>
                <DialogDescription className="text-center">
                  Please sign in to export your document
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center w-full px-6 pb-6">
                <SignIn 
                  afterSignInUrl={window?.location?.pathname}
                  appearance={{
                    baseTheme: theme === "dark" ? dark : undefined,
                    elements: {
                      rootBox: {
                        width: "100%",
                        margin: "0 auto",
                        maxWidth: "400px"
                      },
                      card: {
                        boxShadow: "none",
                        width: "100%",
                        background: "transparent",
                        margin: "0 auto"
                      },
                      headerTitle: { display: "none" },
                      headerSubtitle: { display: "none" },
                      socialButtonsBlockButton: {
                        border: "1px solid hsl(var(--border))",
                        background: "transparent",
                        color: "hsl(var(--foreground))",
                        width: "100%"
                      },
                      formFieldInput: {
                        background: "transparent",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        width: "100%"
                      },
                      formFieldLabel: {
                        color: "hsl(var(--foreground))",
                        fontSize: "14px"
                      },
                      formFieldLabelRow: {
                        color: "hsl(var(--foreground))"
                      },
                      formButtonPrimary: {
                        backgroundColor: "hsl(var(--primary))",
                        color: "hsl(var(--background))",
                        width: "100%"
                      },
                      footerActionLink: {
                        color: "hsl(var(--primary))"
                      },
                      footer: {
                        color: "hsl(var(--muted-foreground))",
                        textAlign: "center"
                      },
                      footerText: {
                        color: "hsl(var(--muted-foreground))"
                      },
                      dividerLine: {
                        background: "hsl(var(--border))"
                      },
                      dividerText: {
                        color: "hsl(var(--muted-foreground))"
                      },
                      form: {
                        width: "100%"
                      },
                      formField: {
                        width: "100%"
                      },
                      formFieldAction: {
                        color: "hsl(var(--primary))"
                      },
                      identityPreviewText: {
                        color: "hsl(var(--foreground))"
                      },
                      formFieldHintText: {
                        color: "hsl(var(--muted-foreground))"
                      },
                      footerActionText: {
                        color: "hsl(var(--muted-foreground))"
                      }
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}