import { NextRequest, NextResponse } from 'next/server';
import { getLeaveReportData, formatRecordsAsCsv } from '@/lib/reports/leaveReport';
import { LeaveReportFilter } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters: LeaveReportFilter = {
      year: searchParams.get('year') || 'all',
      month: searchParams.get('month') || 'all',
      departmentId: searchParams.get('departmentId') || 'all',
      leaveTypeId: searchParams.get('leaveTypeId') || 'all',
      status: searchParams.get('status') || 'all',
    };

    const format = searchParams.get('format') || 'json';

    const { records, stats } = await getLeaveReportData(filters);

    if (format === 'csv') {
      const yearLabel = filters.year && filters.year !== 'all' ? filters.year : 'AllYears';
      const monthLabel = filters.month && filters.month !== 'all' ? `M${filters.month}` : 'Annual';
      const filename = `BTU_Leave_Report_${yearLabel}_${monthLabel}.csv`;

      const csvContent = formatRecordsAsCsv(
        records,
        `Official Leave Summary Report (${yearLabel} - ${monthLabel})`
      );

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
      stats,
    });
  } catch (err: unknown) {
    console.error('Error generating leave report:', err);
    const msg = err instanceof Error ? err.message : 'Internal error generating leave report';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
