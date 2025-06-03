import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Clean up React components after test execution
afterEach(() => {
  cleanup()
}) 