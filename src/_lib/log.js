// https://raw.githubusercontent.com/ags131/ZeSwarm/v1.1/src/log.js
// Use for HTML styling (Colors loosely match screeps_console)
export const LogLevel = {
    SILLY: -1,
    DEBUG: 0,
    INFO: 1,
    ALERT: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5
  }

  const styles = {
    default: 'color: white; background-color: black',
    [LogLevel.SILLY]: 'color: blue',
    [LogLevel.DEBUG]: 'color: #008FAF',
    [LogLevel.INFO]: 'color: green',
    [LogLevel.ALERT]: 'color: #00BFAF',
    [LogLevel.WARN]: 'color: orange',
    [LogLevel.ERROR]: 'color: red',
    [LogLevel.FATAL]: 'color: yellow; background-color: red'
  }

  let y = 0
  let tick = 0

  export class Logger {
    static get LogLevel () {
      return LogLevel
    }

    constructor (prefix = '') {
      this.prefix = prefix ? prefix + ' ' : ''
      this.level = Memory.loglevel ? Memory.loglevel.default : LogLevel.INFO
      this._log = console.log // This allows for console hooking
    }

    withPrefix (prefix) {
      return new Logger(prefix)
    }

    hook (level = 'info') {
      Object.defineProperty(console, 'log', {
        value: (...a) => {
          this[level](a.join(' '))
        }
      })
    }

    unhook () {
      Object.defineProperty(console, 'log', {
        value: this._log
      })
    }

    log (level, message) {
      if (level >= this.level) {
        if (typeof message === 'function') {
          message = message()
        }
        const style = styles[level] || styles.default
        this._log(`<log severity="${level}" style="${style}">[${level}] ${this.prefix}${message}</log>`)
        // this.vlog(level, `[${level}] ${this.prefix} ${message}`)
      }
    }

    vlog (level, message) {
      if (tick !== Game.time) y = 0.2
      tick = Game.time
      const style = styles[level] || styles.default
      const color = style.match(/color: ([a-z]*)/)[1]
      const vis = new RoomVisual()
      try {
        vis.text(message, 0, y, { align: 'left', color })
      } catch (e) {}
      y += 0.8
    }

    debug (message) {
      this.log(LogLevel.DEBUG, message)
    }

    info (message) {
      this.log(LogLevel.INFO, message)
    }

    warn (message) {
      this.log(LogLevel.WARN, message)
    }

    alert (message) {
      this.log(LogLevel.ALERT, message)
    }

    error (message) {
      if (message instanceof Error) {
        // message = ErrorMapper.map(message)
      }
      this.log(LogLevel.ERROR, message)
    }

    fatal (message) {
      this.log(LogLevel.FATAL, message)
    }
  }

  export default new Logger()
