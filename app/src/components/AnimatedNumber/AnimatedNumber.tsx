"use client"
import React, { type FC, useCallback, useEffect, useState } from "react"

type AnimatedNumberProps = {
  duration?: number
  onChange: (value: number) => void
  startValue?: number
  value?: number
}

export const AnimatedNumber: FC<AnimatedNumberProps> = ({ onChange, duration = 100, value = 0.00 }) => {
  const [currentValue, setCurrentValue] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  const [startTime, setStartTime] = useState(new Date().getTime())

  const easing = (x: number) => {
    if (x === 0) {
      return 0
    }

    if (x === 1) {
      return 1
    }

    if (x < 0.5) {
      return Math.pow(2, 20 * x - 10) / 2
    }

    return (2 - Math.pow(2, -20 * x + 10)) / 2
  }

  const animate = useCallback(() => {
    const now = new Date().getTime()
    const diff = value - previousValue

    if (diff === 0) {
      return
    }

    if (now - startTime < duration) {
      const percentage = (now - startTime) / duration
      const nextValue = previousValue + (diff * easing(percentage))

      setCurrentValue(nextValue)

      if (onChange) {
        onChange(nextValue)
      }

      requestAnimationFrame(animate)
    } else {
      setPreviousValue(value)
    }
  }, [duration, startTime, onChange, setCurrentValue, value, setPreviousValue])

  useEffect(() => {
    setStartTime(new Date().getTime())
  }, [value])

  useEffect(() => {
    requestAnimationFrame(animate)
  }, [startTime])
  
  return <span>{currentValue.toFixed(2).padStart(5, "0")}</span>
}