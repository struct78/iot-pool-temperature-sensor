"use client"
import { formatDistance } from "date-fns";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BiLogoGithub as GithubLogo } from "react-icons/bi";
import config from "../../../../config.json";
import { AnimatedNumber } from "../AnimatedNumber/AnimatedNumber";

type QueryProps = {
  date: number
  temperature: number
}

const styles = {
  unknown: "bg-black",
  cold: "bg-blue",
  okay: "bg-purple",
  warm: "bg-orange",
  perfect: "bg-green",
}

const emojis = {
  unknown: "😕",
  cold: "🥶",
  okay: "🤷",
  warm: "👌",
  perfect: "🌴",
}

const getKeyFromTemperature = (temperature?: number) => {
  if (!temperature) {
    return "unknown"
  }

  if (temperature < 20) {
    return "cold"
  }

  if (temperature < 25) {
    return "okay"
  }

  if (temperature < 28) {
    return "warm"
  }

  return "perfect"
}

export const Query = ({
  date: serverDate,
  temperature: serverTemperature,
}: QueryProps) => {
  const [date, setDate] = useState<number>(serverDate)
  const [lastFetchTime, setLastFetchTime] = useState<number>(serverDate)
  const [temperature, setTemperature] = useState<number>(serverTemperature)
  const [feel, setFeel] = useState<keyof typeof styles>(getKeyFromTemperature(temperature))
  
  const abortControllerRef = useRef(new AbortController())
  const delay = 5000
  const formattedTime = date ? new Date(date) : null
  const lastUpdatedDate = formattedTime ? `${formatDistance(formattedTime, new Date(), { includeSeconds: true })} ago` : "-"
  const lastFetchedTime = lastFetchTime ? `${formatDistance(lastFetchTime, new Date(), { includeSeconds: true })} ago` : lastUpdatedDate

  async function fetchTemperature(abortSignal: AbortSignal) {
    try {
      const res = await fetch(`https://api.${config.domainName}/app/read`, {
        cache: "no-cache",
        signal: abortSignal,
      })
      const { date, temperature } = await res.json() as unknown as QueryProps
      setDate(date)
      setTemperature(temperature)
      setLastFetchTime(new Date().getTime())
    } catch (err) {
      if (!abortSignal.aborted) {
        console.error(err)
      }
    }
  }

  const handleChange = (value: number) => {
    setFeel(getKeyFromTemperature(value))
  }

  useEffect(() => {
    const tick = () => {
      void fetchTemperature(abortControllerRef.current.signal)
    }

    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])

  return (
    <main
      className={`flex h-screen w-screen flex-col items-center justify-center text-white transition-colors duration-500 ${styles[feel]}`}
    >
      <h1 className="leading-none text-md font-extralight sm:text-lg lg:text-xl">
        <AnimatedNumber
          duration={4000}
          onChange={handleChange}
          value={temperature}
        />
        &deg;
      </h1>
      <h5 className="text-sm sm:text-md">
        {emojis[feel]}
      </h5>
      <h6 className="text-xxs sm:text-xs">Pool temperature was measured {lastUpdatedDate}</h6>
      <h6 className="text-xxs sm:text-xs">API last checked {lastFetchedTime}</h6>
      <Link href="https://github.com/struct78/iot-pool-temperature-sensor">
        <GithubLogo className="w-4 h-4 mt-8 md:h-8 md:w-8" />
      </Link>
    </main>
  )
}
