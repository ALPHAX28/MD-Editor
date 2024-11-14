import { Components } from 'react-markdown'

declare module 'react-markdown' {
  export interface Components extends Partial<Components> {
    math?: (props: { value: any }) => JSX.Element | null
    inlineMath?: (props: { value: any }) => JSX.Element | null
  }
} 