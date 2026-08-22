declare module '*.woff?url' {
  const url: string
  export default url
}

interface ImportMetaEnv {
  readonly PROD: boolean
  readonly VITE_PATIENT_FULL_NAME?: string
  readonly VITE_PATIENT_DOB?: string
  readonly VITE_PATIENT_CURP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
