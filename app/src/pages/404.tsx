import React, { type FC } from "react"
import { HeadFC, type PageProps } from "gatsby"

const NotFoundPage: FC<PageProps> = () => {
  return (
    <p>Not Found</p>
  )
}

export default NotFoundPage

export const Head: HeadFC = () => <title>Not Found</title>
