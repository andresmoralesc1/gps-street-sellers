'use client'

import { useRouter } from 'next/navigation'
import { OnboardingSlider } from './components/OnboardingSlider'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/login')
  }

  return <OnboardingSlider onComplete={handleComplete} />
}
