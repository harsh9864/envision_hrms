__version__ = "0.0.1"

import hrms.hr.doctype.employee_checkin.employee_checkin
import envision_hrms.overrides.employee_checkin

hrms.hr.doctype.employee_checkin.employee_checkin.add_log_based_on_employee_field = (
    envision_hrms.overrides.employee_checkin.add_log_based_on_employee_field
)
hrms.hr.doctype.employee_checkin.employee_checkin.add_header = (
    envision_hrms.overrides.employee_checkin.add_header
)

import hrms.hr.doctype.attendance.attendance
import envision_hrms.overrides.custom_upload_attendance

hrms.hr.doctype.attendance.attendance.Attendance.validate = envision_hrms.overrides.custom_upload_attendance.custom_validate

from hrms.payroll.doctype.salary_slip.salary_slip import SalarySlip
from envision_hrms.overrides.salary_slip import custom_get_working_days_details

SalarySlip.get_working_days_details = custom_get_working_days_details