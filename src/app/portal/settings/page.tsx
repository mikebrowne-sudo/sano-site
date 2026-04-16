import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
        <Settings size={32} className="text-sage-200 mx-auto mb-3" />
        <p className="text-sage-600 text-sm">Account and portal settings coming soon.</p>
      </div>
    </div>
  )
}
