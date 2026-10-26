import { bindActionSounds } from '../lib/action-sounds'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { OneTimeCode } from '../components/OneTimeCode'
import { primeOtpAudio, otpSound } from '../lib/otp-sounds'
import '../styles/one-time-code.css'

declare global { interface Window { decryptPage: (code:string)=>Promise<string> } }
function Gate() {
  const [error,setError]=useState('')
  return <div data-sound="silent" onPointerDownCapture={primeOtpAudio} onKeyDownCapture={primeOtpAudio}>
    <label id="code-label" htmlFor="password">Escribe el código</label>
    <OneTimeCode length={7} corner={14} verify={async code=>{
      setError('')
      return window.decryptPage(code)
    }} onReject={()=>{otpSound('deny');setError('Código incorrecto')}}
    onVerified={html=>{document.open();document.write(html);document.close()}} />
    <div id="error" className="error" role="alert">{error}</div>
  </div>
}
bindActionSounds()
createRoot(document.getElementById('gate-input')!).render(<Gate />)
