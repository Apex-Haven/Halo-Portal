import { motion } from 'framer-motion'

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  color = 'primary',
  loading = false 
}) => {
  const colorClasses = {
    primary: 'bg-primary-500 dark:bg-primary-600',
    success: 'bg-success-500 dark:bg-success-600',
    warning: 'bg-warning-500 dark:bg-warning-600',
    danger: 'bg-danger-500 dark:bg-danger-600',
    info: 'bg-blue-500 dark:bg-blue-600'
  }

  const textColorClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    success: 'text-success-600 dark:text-success-400',
    warning: 'text-warning-600 dark:text-warning-400',
    danger: 'text-danger-600 dark:text-danger-400',
    info: 'text-blue-600 dark:text-blue-400'
  }

  const changeColorClasses = {
    positive: 'text-success-600 dark:text-success-400',
    negative: 'text-danger-600 dark:text-danger-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-content">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {loading ? (
              <div className="mt-2 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            )}
            {change && !loading && (
              <div className="mt-2 flex items-center">
                <span className={`text-sm font-medium ${changeColorClasses[changeType]}`}>
                  {change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last period</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10 dark:bg-opacity-20`}>
              <Icon className={`h-6 w-6 ${textColorClasses[color]}`} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default StatsCard
