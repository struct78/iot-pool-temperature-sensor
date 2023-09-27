import { render, waitFor } from "@testing-library/react"
import { AnimatedNumber } from "./AnimatedNumber"
import React from "react"

describe("AnimatedNumber", () => {
  it("should animate to 1000", async () => {
    const onChange = jest.fn()
    const { getByText } = render(<AnimatedNumber onChange={onChange} duration={1} value={21.52} />)

    await waitFor(() => {
      expect(getByText("21.52")).toBeInTheDocument()
    }) 
  })
})