'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Demo trigger for the app-wide toaster (see ui/sonner.tsx). */
const Sonner10 = () => {
  return (
    <Button
      variant='outline'
      onClick={() =>
        toast.success('Accepted', {
          description: 'Submission #1043 passed 3 of 3 tests.',
        })
      }
    >
      Show success toast
    </Button>
  )
}

export default Sonner10
