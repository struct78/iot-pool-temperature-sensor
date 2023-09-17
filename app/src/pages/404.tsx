import * as React from "react"
import { Link, HeadFC, PageProps } from "gatsby"

const NotFoundPage: React.FC<PageProps> = () => {
  return (
    <p>Not Found</p>
  )
}

export default NotFoundPage

export const Head: HeadFC = () => <title>Not Found</title>
