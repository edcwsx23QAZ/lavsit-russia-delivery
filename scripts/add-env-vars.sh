#!/bin/bash
# Скрипт для добавления переменных окружения в Vercel

VERCEL_TOKEN="RnInNokLq4N7UuMfJC5Z2HcZ"
PROJECT_NAME="lavsit-russia-delivery"

export VERCEL_TOKEN

echo "🔧 Добавление переменных окружения..."

# NEXT_PUBLIC_SUPABASE_URL
echo "Добавление NEXT_PUBLIC_SUPABASE_URL для production..."
echo "https://sirqrnffrpdkdtqiwjgq.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --token $VERCEL_TOKEN

echo "Добавление NEXT_PUBLIC_SUPABASE_URL для preview..."
echo "https://sirqrnffrpdkdtqiwjgq.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --token $VERCEL_TOKEN

echo "Добавление NEXT_PUBLIC_SUPABASE_URL для development..."
echo "https://sirqrnffrpdkdtqiwjgq.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL development --token $VERCEL_TOKEN

# NEXT_PUBLIC_SUPABASE_ANON_KEY
echo "Добавление NEXT_PUBLIC_SUPABASE_ANON_KEY для production..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token $VERCEL_TOKEN

echo "Добавление NEXT_PUBLIC_SUPABASE_ANON_KEY для preview..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --token $VERCEL_TOKEN

echo "Добавление NEXT_PUBLIC_SUPABASE_ANON_KEY для development..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnFybmZmcnBka2R0cWl3amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUzMjgsImV4cCI6MjA3NDkzMTMyOH0.v4FIUd_A-NoPARN9IOyI5TjJfOKijNzMfJEGyDyKYG8" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development --token $VERCEL_TOKEN

# DATABASE_URL
echo "Добавление DATABASE_URL для production..."
echo "postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" | vercel env add DATABASE_URL production --token $VERCEL_TOKEN

echo "Добавление DATABASE_URL для preview..."
echo "postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" | vercel env add DATABASE_URL preview --token $VERCEL_TOKEN

echo "Добавление DATABASE_URL для development..."
echo "postgresql://postgres:edcwsx123QAZ!@db.sirqrnffrpdkdtqiwjgq.supabase.co:5432/postgres?schema=public" | vercel env add DATABASE_URL development --token $VERCEL_TOKEN

echo "✅ Переменные добавлены!"
vercel env ls --token $VERCEL_TOKEN

