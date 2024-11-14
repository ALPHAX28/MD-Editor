import { Components } from 'react-markdown'

declare module 'react-markdown' {
  interface ReactMarkdownProps {
    components?: Partial<Components> & {
      math?: (props: { value: any }) => JSX.Element | null
      inlineMath?: (props: { value: any }) => JSX.Element | null
    }
  }
} 