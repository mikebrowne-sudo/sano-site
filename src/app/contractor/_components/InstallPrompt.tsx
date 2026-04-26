'use client'

// Phase 5.5.4 — Install-to-home-screen prompt for the contractor portal.
//
// Behaviours:
// - Hidden once the app is already running standalone (display-mode).
// - Hidden permanently after the user dismisses (localStorage key).
// - Android/Chrome: captures `beforeinstallprompt` and offers Install.
// - iOS Safari: shows a "Share → Add to Home Screen" hint card,
//   since iOS does not expose an install-prompt API.
// - Renders nothing until mounted to avoid SSR hydration noise.

import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'

const DISMISS_KEY = 'sano-install-prompt-dismissed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setMounted(true)
    if (typeof window === 'undefined') return

    if (window.localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true)
    }

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS exposes navigator.standalone outside the spec.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    setStandalone(!!isStandalone)

    // iOS Safari does not fire beforeinstallprompt; show the hint card
    // so users get a manual instruction. Detect crudely via UA.
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
    if (isIOS && !isStandalone) setIosHint(true)

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const result = await deferred.userChoice
    if (result.outcome === 'accepted' || result.outcome === 'dismissed') {
      dismiss()
    }
  }

  if (!mounted || dismissed || standalone) return null
  if (!deferred && !iosHint) return null

  return (
    <div className="md:hidden fixed inset-x-0 z-50 px-3" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}>
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-sage-100 p-3.5 flex items-start gap-3">
        <div className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
          <Plus size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sage-800">Add Sano to your home screen</p>
          {iosHint ? (
            <p className="text-xs text-sage-600 mt-0.5 leading-relaxed">
              On iPhone, tap <span className="font-semibold">Share</span>, then <span className="font-semibold">Add to Home Screen</span> for quicker access to your jobs.
            </p>
          ) : (
            <p className="text-xs text-sage-600 mt-0.5 leading-relaxed">
              Add Sano to your home screen for quicker access to your jobs.
            </p>
          )}
          {!iosHint && deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 bg-sage-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-sage-700 active:bg-sage-800 transition-colors"
            >
              Install
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="text-sage-400 hover:text-sage-600 transition-colors p-1 -m-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
