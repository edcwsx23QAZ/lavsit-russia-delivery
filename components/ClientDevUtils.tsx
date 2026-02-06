"use client"

import React from 'react'

export default function ClientDevUtils() {
  // Минимальная реализация для разработки
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return null // Можно добавить утилиты для разработки при необходимости
}

