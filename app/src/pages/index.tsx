import isPropValid from "@emotion/is-prop-valid"
import { formatDistance, parseISO } from 'date-fns'
import { HeadFC, PageProps, graphql } from "gatsby"
import React, { FC, useEffect, useState } from "react"
import tw, { css, styled } from 'twin.macro'
import { usePolling } from '../hooks/usePolling'
import { AnimatedNumber } from "../components/AnimatedNumber/AnimatedNumber"

type Response = {
  temperature?: number
  time?: string
}

type Data = {
  history: Response
}

type MainProps = {
  feel: keyof typeof styles
}

const styles = {
  unknown: tw`transition-colors duration-500 bg-black`,
  cold: tw`transition-colors duration-500 bg-blue`,
  warm: tw`transition-colors duration-500 bg-orange`,
  perfect: tw`transition-colors duration-500 bg-green`,
}

const emojis = {
  unknown: "",
  cold: "🥶",
  warm: "🤷",
  perfect: "👌",
}

const Main = styled("main", {
  shouldForwardProp: (prop: string) => isPropValid(prop),
})(({ feel }: MainProps) => [
  tw`flex flex-col items-center justify-center w-screen h-screen text-white`,
  feel ? styles[feel] : null,
])

const H1 = tw.h1`
  font-heading font-extralight text-md leading-none sm:text-lg lg:text-xl
`

const H5 = tw.h5`
  font-body font-normal text-sm sm:text-md
`

const H6 = tw.h6`
  font-body font-normal text-xxs sm:text-xs
`

const getKeyFromTemperature = (temperature?: number) => {
  if (!temperature) {
    return "unknown"
  }
  
  if (temperature < 20) {
    return "cold"
  }

  if (temperature < 26) {
    return "warm"
  }

  return "perfect"
}

const IndexPage: FC<PageProps<Data>> = ({ data: queryData }) => {
  const [data, setData] = useState<Response>(queryData.history)
  const [feel, setFeel] = useState<keyof typeof styles>("unknown")
  
  async function fetchTemperature(abortSignal: AbortSignal) {
		try {
			const res = await fetch("https://api.canwegointhepool.com/app/read", { signal: abortSignal })
			const response = await res.json()
      setData(response)
		} catch (err) {
			if (!abortSignal.aborted) {
				console.error(err)
			}
		}
	}
  
  const lastFetchTime = usePolling(fetchTemperature)
  const { temperature, time } = data || {}
  const formattedTime = time ? parseISO(time) : null
  const lastUpdatedDate = formattedTime ? `${formatDistance(formattedTime, new Date())} ago` : "-"
  const lastFetchedTime = lastFetchTime ? `${formatDistance(lastFetchTime, new Date())} ago` : "-"

  const handleChange = (value: number, percentage: number) => {
    setFeel(getKeyFromTemperature(value))
  }

  useEffect(() => {
    document.body.setAttribute("style", css(styles[feel]).styles)
  }, [feel])

  return (
    <Main feel={feel}>
      <H1>
        <AnimatedNumber value={temperature} duration={4000} onChange={handleChange} />&deg;
      </H1>
      <H5>{emojis[feel]}</H5>
      <H6>Temperature was measured {lastUpdatedDate}</H6>
      <H6>App last checked {lastFetchedTime}</H6>
    </Main>
  )
}

export const Head: HeadFC = () => (
  <>
    <title>Can we go in the pool now?</title>
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </>
)

export const query = graphql`
  query TemperatureQuery {
    history: thirdPartyTemperature(temperature:{ ne: null }) {
      time,
      temperature
    }
  }
`

export default IndexPage