import { _decorator } from 'cc';
const { ccclass } = _decorator;

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    LOG = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * 日志配置接口
 */
export interface LogConfig {
    level: LogLevel;
    enableTimestamp: boolean;
    enableModuleName: boolean;
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    maxLogHistory: number;
}

/**
 * 日志记录接口
 */
export interface LogRecord {
    timestamp: number;
    level: LogLevel;
    module: string;
    message: string;
    data?: any;
}

/**
 * 统一日志管理器
 * 提供全局的日志记录和管理功能
 */
@ccclass('Logger')
export class Logger {
    
    private static _instance: Logger = null;
    private _config: LogConfig;
    private _logHistory: LogRecord[] = [];
    private _moduleFilters: Set<string> = new Set();

    private constructor() {
        this._config = {
            level: LogLevel.DEBUG,
            enableTimestamp: true,
            enableModuleName: true,
            enableConsoleOutput: true,
            enableFileOutput: false,
            maxLogHistory: 1000
        };
    }

    /**
     * 获取Logger单例实例
     */
    public static getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    /**
     * 设置日志配置
     */
    public setConfig(config: Partial<LogConfig>) {
        this._config = { ...this._config, ...config };
    }

    /**
     * 获取当前配置
     */
    public getConfig(): LogConfig {
        return { ...this._config };
    }

    /**
     * 设置日志级别
     */
    public setLevel(level: LogLevel) {
        this._config.level = level;
    }

    /**
     * 添加模块过滤器（只显示指定模块的日志）
     */
    public addModuleFilter(moduleName: string) {
        this._moduleFilters.add(moduleName);
    }

    /**
     * 移除模块过滤器
     */
    public removeModuleFilter(moduleName: string) {
        this._moduleFilters.delete(moduleName);
    }

    /**
     * 清空模块过滤器
     */
    public clearModuleFilters() {
        this._moduleFilters.clear();
    }

    /**
     * 检查是否应该输出日志
     */
    private shouldLog(level: LogLevel, moduleName: string): boolean {
        // 检查日志级别
        if (level < this._config.level) {
            return false;
        }

        // 检查模块过滤器
        if (this._moduleFilters.size > 0 && !this._moduleFilters.has(moduleName)) {
            return false;
        }

        return true;
    }

    /**
     * 格式化日志消息
     */
    private formatMessage(level: LogLevel, moduleName: string, message: string): string {
        let formattedMessage = '';

        // 添加时间戳
        if (this._config.enableTimestamp) {
            const timestamp = new Date().toLocaleTimeString();
            formattedMessage += `[${timestamp}] `;
        }

        // 添加日志级别
        const levelName = LogLevel[level];
        formattedMessage += `[${levelName}] `;

        // 添加模块名
        if (this._config.enableModuleName && moduleName) {
            formattedMessage += `[${moduleName}] `;
        }

        // 添加消息内容
        formattedMessage += message;

        return formattedMessage;
    }

    /**
     * 记录日志到历史记录
     */
    private recordLog(level: LogLevel, moduleName: string, message: string, data?: any) {
        const record: LogRecord = {
            timestamp: Date.now(),
            level,
            module: moduleName,
            message,
            data
        };

        this._logHistory.push(record);

        // 限制历史记录数量
        if (this._logHistory.length > this._config.maxLogHistory) {
            this._logHistory.shift();
        }
    }

    /**
     * 输出日志的核心方法
     */
    private output(level: LogLevel, moduleName: string, message: string, data?: any) {
        if (!this.shouldLog(level, moduleName)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, moduleName, message);

        // 记录到历史
        this.recordLog(level, moduleName, message, data);

        // 控制台输出
        if (this._config.enableConsoleOutput) {
            switch (level) {
                case LogLevel.DEBUG:
                case LogLevel.LOG:
                    if (data !== undefined) {
                        console.log(formattedMessage, data);
                    } else {
                        console.log(formattedMessage);
                    }
                    break;
                case LogLevel.WARN:
                    if (data !== undefined) {
                        console.warn(formattedMessage, data);
                    } else {
                        console.warn(formattedMessage);
                    }
                    break;
                case LogLevel.ERROR:
                    if (data !== undefined) {
                        console.error(formattedMessage, data);
                    } else {
                        console.error(formattedMessage);
                    }
                    break;
            }
        }
    }

    /**
     * 调试日志
     */
    public debug(moduleName: string, message: string, data?: any) {
        this.output(LogLevel.DEBUG, moduleName, message, data);
    }

    /**
     * 普通日志
     */
    public log(moduleName: string, message: string, data?: any) {
        this.output(LogLevel.LOG, moduleName, message, data);
    }

    /**
     * 警告日志
     */
    public warn(moduleName: string, message: string, data?: any) {
        this.output(LogLevel.WARN, moduleName, message, data);
    }

    /**
     * 错误日志
     */
    public error(moduleName: string, message: string, data?: any) {
        this.output(LogLevel.ERROR, moduleName, message, data);
    }

    /**
     * 获取日志历史记录
     */
    public getLogHistory(moduleName?: string, level?: LogLevel): LogRecord[] {
        let filteredLogs = this._logHistory;

        if (moduleName) {
            filteredLogs = filteredLogs.filter(log => log.module === moduleName);
        }

        if (level !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.level >= level);
        }

        return [...filteredLogs];
    }

    /**
     * 清空日志历史记录
     */
    public clearHistory() {
        this._logHistory = [];
    }

    /**
     * 导出日志历史为字符串
     */
    public exportLogs(moduleName?: string, level?: LogLevel): string {
        const logs = this.getLogHistory(moduleName, level);
        return logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            const levelName = LogLevel[log.level];
            let logLine = `[${timestamp}] [${levelName}] [${log.module}] ${log.message}`;
            if (log.data) {
                logLine += ` | Data: ${JSON.stringify(log.data)}`;
            }
            return logLine;
        }).join('\n');
    }

    /**
     * 获取统计信息
     */
    public getStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        
        // 按级别统计
        for (const log of this._logHistory) {
            const levelName = LogLevel[log.level];
            stats[levelName] = (stats[levelName] || 0) + 1;
        }

        // 按模块统计
        for (const log of this._logHistory) {
            const moduleName = `Module_${log.module}`;
            stats[moduleName] = (stats[moduleName] || 0) + 1;
        }

        stats['Total'] = this._logHistory.length;
        return stats;
    }
}

/**
 * 便捷的日志工具函数
 */
export class Log {
    private static logger = Logger.getInstance();

    public static debug(moduleName: string, message: string, data?: any) {
        Log.logger.debug(moduleName, message, data);
    }

    public static log(moduleName: string, message: string, data?: any) {
        Log.logger.log(moduleName, message, data);
    }

    public static warn(moduleName: string, message: string, data?: any) {
        Log.logger.warn(moduleName, message, data);
    }

    public static error(moduleName: string, message: string, data?: any) {
        Log.logger.error(moduleName, message, data);
    }

    public static setLevel(level: LogLevel) {
        Log.logger.setLevel(level);
    }

    public static setConfig(config: Partial<LogConfig>) {
        Log.logger.setConfig(config);
    }

    public static getHistory(moduleName?: string, level?: LogLevel): LogRecord[] {
        return Log.logger.getLogHistory(moduleName, level);
    }

    public static exportLogs(moduleName?: string, level?: LogLevel): string {
        return Log.logger.exportLogs(moduleName, level);
    }

    public static getStats(): { [key: string]: number } {
        return Log.logger.getStats();
    }
}