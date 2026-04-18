import React, { useState } from 'react';
import { Calendar, FileDown, Clock, X, CheckCircle } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { 
  generateReportMarkdown, 
  analyzeTasksForReport, 
  getWeekRange, 
  getMonthRange,
  type ReportOptions 
} from '../utils/reportGenerator';
import { isTauri } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';

interface ReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportExportDialog({ isOpen, onClose }: ReportExportDialogProps) {
  const { tasks } = useTaskStore();
  const [reportType, setReportType] = useState<'week' | 'month'>('week');
  const [customRange, setCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [options, setOptions] = useState({
    includeCompleted: true,
    includeOverdue: true,
    includePending: true
  });
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      // 确定时间范围
      let dateRange;
      if (customRange) {
        if (!startDate || !endDate) {
          toast.error('请选择完整的时间范围');
          return;
        }
        dateRange = {
          start: new Date(startDate + 'T00:00:00'),
          end: new Date(endDate + 'T23:59:59')
        };
      } else {
        dateRange = reportType === 'week' ? getWeekRange() : getMonthRange();
      }

      const reportOptions: ReportOptions = {
        type: reportType,
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...options
      };

      // 分析数据并生成报告
      const reportData = analyzeTasksForReport(tasks, reportOptions);
      const markdownContent = generateReportMarkdown(reportData, reportOptions);

      // 生成文件名和内容
      const formatDate = (date: Date) => date.toISOString().slice(0, 10);
      const periodText = reportType === 'week' ? '周报' : '月报';
      const fileName = `事半SemiDone_${periodText}_${formatDate(dateRange.start)}_${formatDate(dateRange.end)}.md`;

      if (isTauri()) {
        const filePath = await save({
          defaultPath: fileName,
          filters: [
            {
              name: 'Markdown',
              extensions: ['md']
            }
          ]
        });

        if (!filePath) {
          toast.info('已取消导出');
          return;
        }

        await writeTextFile(filePath, markdownContent);
      } else {
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`${periodText}导出成功！`);
      onClose();
    } catch (error) {
      console.error('导出报告失败:', error);
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const getPreviewStats = () => {
    const dateRange = customRange && startDate && endDate 
      ? { start: new Date(startDate + 'T00:00:00'), end: new Date(endDate + 'T23:59:59') }
      : reportType === 'week' ? getWeekRange() : getMonthRange();
    
    const reportOptions: ReportOptions = {
      type: reportType,
      startDate: dateRange.start,
      endDate: dateRange.end,
      ...options
    };

    return analyzeTasksForReport(tasks, reportOptions);
  };

  const previewStats = getPreviewStats();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">导出周/月报</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 报告类型选择 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">报告类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportType('week')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  reportType === 'week'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">周报</span>
              </button>
              <button
                onClick={() => setReportType('month')}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  reportType === 'month'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">月报</span>
              </button>
            </div>
          </div>

          {/* 时间范围设置 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">时间范围</label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customRange}
                  onChange={(e) => setCustomRange(e.target.checked)}
                  className="rounded border-border"
                />
                自定义范围
              </label>
            </div>
            
            {customRange ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">开始日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">结束日期</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-accent/50 rounded-lg text-sm text-muted-foreground">
                {reportType === 'week' 
                  ? `本周 (${getWeekRange().start.toLocaleDateString('zh-CN')} - ${getWeekRange().end.toLocaleDateString('zh-CN')})` 
                  : `本月 (${getMonthRange().start.toLocaleDateString('zh-CN')} - ${getMonthRange().end.toLocaleDateString('zh-CN')})`
                }
              </div>
            )}
          </div>

          {/* 内容选项 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">包含内容</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.includeCompleted}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeCompleted: e.target.checked }))}
                  className="rounded border-border"
                />
                <CheckCircle className="w-4 h-4 text-green-500" />
                已完成任务
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.includePending}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePending: e.target.checked }))}
                  className="rounded border-border"
                />
                <Clock className="w-4 h-4 text-blue-500" />
                待完成任务
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.includeOverdue}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeOverdue: e.target.checked }))}
                  className="rounded border-border"
                />
                <X className="w-4 h-4 text-red-500" />
                逾期任务
              </label>
            </div>
          </div>

          {/* 预览统计 */}
          <div className="bg-accent/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <FileDown className="w-4 h-4" />
              报告预览
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总任务数:</span>
                <span className="font-medium">{previewStats.summary.totalTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">完成率:</span>
                <span className="font-medium text-green-600">
                  {(previewStats.summary.completionRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">已完成:</span>
                <span className="font-medium text-green-600">{previewStats.summary.completedTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">逾期任务:</span>
                <span className="font-medium text-red-600">{previewStats.summary.overdueTasks}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? '导出中...' : '导出报告'}
          </button>
        </div>
      </div>
    </div>
  );
}
