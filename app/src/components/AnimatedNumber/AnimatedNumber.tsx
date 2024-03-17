"use client"
import React, { type FC, useCallback, useEffect, useState, useRef } from "react"

type AnimatedNumberProps = {
  duration?: number
  onChange: (value: number) => void
  startValue?: number
  value?: number
}

export const AnimatedNumber: FC<AnimatedNumberProps> = ({ onChange, duration = 100, startValue = 0.00, value = 0.00 }) => {
  const [currentValue, setCurrentValue] = useState(startValue)
  const startTime = useRef(new Date().getTime())

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

    if (now - startTime.current < duration) {
      const percentage = (now - startTime.current) / duration
      const nextValue = value * easing(percentage)

      setCurrentValue(nextValue)

      if (onChange) {
        onChange(nextValue)
      }

      requestAnimationFrame(animate)
    } else {
      setCurrentValue(Number(value))
    }
  }, [startTime, onChange, setCurrentValue, value])

  useEffect(() => {
    requestAnimationFrame(animate)
  }, [value])
  
  return <span>{currentValue.toFixed(2).padStart(5, "0")}</span>
}