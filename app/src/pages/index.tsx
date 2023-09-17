import isPropValid from "@emotion/is-prop-valid"
import { formatDistance, parseISO } from 'date-fns'
import { graphql, HeadFC, PageProps } from "gatsby"
import React, { FC, useEffect, useState } from "react"
import tw, { css, styled } from 'twin.macro'
import { usePolling } from '../hooks/usePolling'
import { BallTriangle } from 'react-loader-spinner'

type Response = {
  temperature?: number
  time?: string
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
  text-md leading-none sm:text-xl
`

const H5 = tw.h5`
  text-sm sm:text-md
`

const H6 = tw.h6`
  text-xxs sm:text-xs
`

const getKeyFromTemperature = (temperature?: number) => {
  if (!temperature) {
    return "unknown"
  }
  
  if (temperature < 22) {
    return "cold"
  }

  if (temperature < 26) {
    return "warm"
  }

  return "perfect"
}

const IndexPage: FC<PageProps> = ({ data: queryData, ...rest }) => {
  const [data, setData] = useState<Response>()
  const [loading, setLoading] = useState<boolean>(false)
  const [isInitialised, setIsInitialised] = useState<boolean>(false)
  const lastFetchTime = usePolling(fetchTemperature)
  
  async function fetchTemperature(abortSignal: AbortSignal) {
		try {
      setLoading(true)
			const res = await fetch("https://api.canwegointhepool.com/app/read", { signal: abortSignal })
			const response = await res.json()
      setData(response)
		} catch (err) {
			if (!abortSignal.aborted) {
				console.error(err)
			}
		} finally {
      setLoading(false)
      setIsInitialised(true)
    }
	}


  const { temperature, time } = data || {}
  const formattedTime = parseISO(time)
  const feel = getKeyFromTemperature(temperature)
  const lastUpdatedDate = time ? `${formatDistance(formattedTime, new Date())} ago` : "-"
  const lastFetchedTime = lastFetchTime ? `${formatDistance(lastFetchTime, new Date())} ago` : "-"

  useEffect(() => {
    document.body.setAttribute("style", css(styles[feel]).styles)
  }, [feel])

  return (
    <Main feel={feel}>
      {loading && !isInitialised && <BallTriangle color="#FFF" height={128} width={128} />}
      {isInitialised && (
        <>
          {temperature ? <H1>{temperature}&deg;</H1> : <H1>Offline</H1>}
          <H5>{emojis[feel]}</H5>
          {temperature && <H6>Temperature was measured {lastUpdatedDate}</H6>}
          <H6>App last checked {lastFetchedTime}</H6>
        </>
      )}
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
    allThirdPartyTemperature {
      nodes {
        temperature
        time
      }
    }
  }
`

export default IndexPage