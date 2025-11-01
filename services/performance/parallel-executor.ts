/**
 * TORP Parallel Executor
 * Utilitaires pour exécution parallèle optimisée avec gestion d'erreurs
 */

interface TaskResult<T> {
  success: boolean
  data?: T
  error?: Error
  duration: number
}

interface ParallelExecutionOptions {
  maxConcurrency?: number
  timeout?: number
  retries?: number
  continueOnError?: boolean
}

export class ParallelExecutor {
  /**
   * Exécute des tâches en parallèle avec limite de concurrence
   */
  static async executeParallel<T>(
    tasks: Array<() => Promise<T>>,
    options: ParallelExecutionOptions = {}
  ): Promise<Array<TaskResult<T>>> {
    const {
      maxConcurrency = 5,
      timeout = 30000,
      retries = 1,
      continueOnError = true,
    } = options

    const results: Array<TaskResult<T>> = []
    const executing: Promise<void>[] = []

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const taskIndex = i

      // Attendre qu'une slot soit disponible
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }

      // Exécuter la tâche
      const taskPromise = this.executeWithRetry(task, timeout, retries)
        .then((result) => {
          results[taskIndex] = result
        })
        .catch((error) => {
          if (!continueOnError) {
            throw error
          }
          results[taskIndex] = {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            duration: 0,
          }
        })
        .finally(() => {
          // Retirer de la liste des exécutions
          const index = executing.indexOf(taskPromise)
          if (index > -1) {
            executing.splice(index, 1)
          }
        })

      executing.push(taskPromise)
    }

    // Attendre la fin de toutes les tâches
    await Promise.all(executing)

    return results
  }

  /**
   * Exécute une tâche avec retry
   */
  private static async executeWithRetry<T>(
    task: () => Promise<T>,
    timeout: number,
    retries: number
  ): Promise<TaskResult<T>> {
    let lastError: Error | undefined
    const startTime = Date.now()

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          task(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ])

        return {
          success: true,
          data: result,
          duration: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < retries) {
          // Attendre avant retry avec backoff exponentiel
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000))
          )
        }
      }
    }

    return {
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Exécute des tâches par groupes séquentiels (chaque groupe en parallèle)
   */
  static async executeBatched<T>(
    tasks: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<Array<TaskResult<T>>> {
    const results: Array<TaskResult<T>> = []

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(
        batch.map((task) => task())
      )

      batchResults.forEach((result, index) => {
        const taskIndex = i + index
        if (result.status === 'fulfilled') {
          results[taskIndex] = {
            success: true,
            data: result.value,
            duration: 0, // Pourrait être mesuré
          }
        } else {
          results[taskIndex] = {
            success: false,
            error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
            duration: 0,
          }
        }
      })
    }

    return results
  }

  /**
   * Filtre les résultats réussis
   */
  static filterSuccessful<T>(results: Array<TaskResult<T>>): T[] {
    return results
      .filter((r) => r.success && r.data !== undefined)
      .map((r) => r.data as T)
  }

  /**
   * Statistiques d'exécution
   */
  static getStats(results: Array<TaskResult<any>>): {
    total: number
    successful: number
    failed: number
    averageDuration: number
    totalDuration: number
  } {
    const successful = results.filter((r) => r.success).length
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

    return {
      total: results.length,
      successful,
      failed: results.length - successful,
      averageDuration: results.length > 0 ? totalDuration / results.length : 0,
      totalDuration,
    }
  }
}

