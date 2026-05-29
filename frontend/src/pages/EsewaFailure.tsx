import { Link } from 'react-router-dom'
import { RotateCcw, XCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function EsewaFailure() {
  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="flex flex-col items-center text-center gap-5 py-8">
            <XCircle className="w-14 h-14 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                Payment Failed
              </h1>
              <p className="text-gray-600 dark:text-dark-text-secondary">
                Payment failed or cancelled.
              </p>
            </div>
            <Link to="/subscription">
              <Button>
                <RotateCcw className="w-4 h-4 mr-2" />
                Back to Subscription
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
