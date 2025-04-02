frappe.ui.form.on('Salary Slip', {
    after_save: function(frm) {
        // Only calculate if values are not set to prevent overwriting
        if (!frm.doc.custom_ot_hours || !frm.doc.total_public_holidays) {
            calculate_ot_hours(frm);
        }
    },
    employee: function(frm) {
        calculate_ot_hours(frm);
    },
    start_date: function(frm) {
        calculate_ot_hours(frm);
    },
    end_date: function(frm) {
        calculate_ot_hours(frm);
    }
});

function calculate_ot_hours(frm) {
    if (frm.doc.employee && frm.doc.start_date && frm.doc.end_date) {
        frappe.call({
            method: "envision_hrms.envision_hrms.custom_py.salary_ot_calculation.get_total_ot_hours",
            args: {
                employee: frm.doc.employee,
                from_date: frm.doc.start_date,
                to_date: frm.doc.end_date
            },
            callback: function(r) {
                if (r.message) {
                    let total_ot_hours = r.message.total_ot_hours || 0;
                    let total_ph = r.message.total_ph || 0;

                    if (frm.doc.custom_ot_hours !== total_ot_hours || frm.doc.total_public_holidays !== total_ph) {
                        frm.set_value("custom_ot_hours", total_ot_hours);
                        frm.set_value("total_public_holidays", total_ph);
                        frm.save();  // Ensure changes are saved immediately
                    }
                }
            }
        });
    }
}

frappe.ui.form.on('Employee', {
    document_template: function (frm) {
        if (frm.doc.document_template) {
            // Fetch the Document Template details
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Employee Document Template",
                    name: frm.doc.document_template
                },
                callback: function (r) {
                    if (r.message) {
                        const document_template = r.message;
                        console.log(document_template)
                        const documents = document_template.documents || [];

                        // Clear the existing document_checklist table
                        frm.clear_table('document_checklist');

                        // Add each document to the checklist table
                        documents.forEach(doc => {
                            const row = frm.add_child('document_checklist');
                            row.document = doc.document; // Update the field name based on your field's actual name
                        });

                        // Refresh the table
                        frm.refresh_field('document_checklist');
                    }
                }
            });
        } else {
            // Clear the checklist table if no template is selected
            frm.clear_table('document_checklist');
            frm.refresh_field('document_checklist');
        }
    },
    refresh(frm){
        frm.set_query('advance_account', function() {
            if (frm.doc.company) {
                return {
                    filters: {
                        company: frm.doc.company
                        }
                    };
                }
        });
    },
    onload(frm){
        if (frappe.session.user.has_role("Accounts Manager,HR Manager")) {
			frm.add_custom_button(__('Update Advance Limit'), function () {
                let dl = new frappe.ui.Dialog({
                    title: 'Enter New Limit',
                    fields: [{
                        label: 'New Advance Limit',
                        fieldname: 'new_limit',
                        fieldtype: 'Currency',
                        reqd: 1
                    },
                    ],
                    primary_action_label: 'Update',
                    primary_action(values) {
                        frappe.db.set_value('Employee', frm.doc.name, {
                            'advance_limit': values.new_limit,
                        })
                        dl.hide();
                        location.reload();
                    }
                });
                dl.show();
            })
		}
    }
});

frappe.ui.form.on('Employee Advance', {
    advance_amount: function(frm) {
        if (frm.doc.employee && frm.doc.advance_amount) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Employee',
                    filters: { name: frm.doc.employee },
                    fieldname: 'advance_limit'
                },
                callback: function(r) {
                    if (r.message && r.message.advance_limit !== undefined) {
                        let advance_limit = r.message.advance_limit || 0;
                        if (frm.doc.advance_amount > advance_limit) {
                            frappe.msgprint({
                                title: __('Validation Error'),
                                message: __('Advance amount cannot exceed the advance limit of ₹{0}', [advance_limit]),
                                indicator: 'red'
                            });
                            frm.set_value('advance_amount', '');
                        }
                    }
                }
            });
        }
    }
});

frappe.ui.form.on('Retention Bonus', {
    bonus_wage : function(frm){
        frm.set_value("bonus_amount",0.00);
        frm.refresh_field("bonus_amount");
    },
    bonus_percentage : function(frm){
        frm.set_value("bonus_amount",0.00);
        frm.refresh_field("bonus_amount");
    },
    get_salary_slip : function(frm) {
        if (!frm.doc.from_date || !frm.doc.to_date){
            frappe.msgprint("Please select valid date range")
        }
        var yearly_bonus = frm.doc.yearly_bonus;
        var emp = frm.doc.employee;
        var from_date = frm.doc.from_date;
        var to_date = frm.doc.to_date;

        if (yearly_bonus === 1 && emp && from_date && to_date) {
            frappe.call({
                method: "envision_hrms.envision_hrms.custom_py.yearly_bonus.get_employee_bonus",
                args: {
                    employee: emp,
                    from_date: from_date,
                    to_date: to_date
                },
                async: false,
                callback: function (response) {
                    console.log(response.message);
                    if (response.message){
                        frm.clear_table("employee_bonus");

                        var salary_slips = response.message[0];
                        var get_salary_data = response.message[1];
                        var totalBonus = 0;
                        var totalAmount = 0.0;

                        for (var i = 0; i < salary_slips.length; i++) {
                            var row = frm.add_child("employee_bonus");
                            row.salary_slip = salary_slips[i].name;
                            row.basic_salary = salary_slips[i].base_gross_pay - get_salary_data[i].amount;
                            
                            var amount = salary_slips[i].base_gross_pay - get_salary_data[i].amount;
                            totalAmount += amount
                        }

                        frm.refresh_field("employee_bonus");
                        // frm.set_value("salary_component", "Bonus");
                        totalAmount = parseFloat(totalAmount.toFixed(0));
                        frm.set_value("bonus_wage", totalAmount);
                        frm.refresh_field("bonus_wage");
                    }
                    else{
                        frappe.msgprint("No Salary Slips Found between selected Dates")
                    }
                }
            });
        }
    },
    before_save:function(frm){
        if (frm.doc.yearly_bonus == 1 && frm.doc.bonus_percentage && frm.doc.bonus_wage) {
            if(frm.doc.bonus_amount == 0.00){
                var bp = frm.doc.bonus_percentage / 100 ;
                bp = parseFloat(bp.toFixed(4));
                console.log(bp)
                totalBonus = frm.doc.bonus_wage * bp;
                totalBonus = parseFloat(totalBonus.toFixed(0));
                console.log(totalBonus)
                frm.set_value("bonus_amount", totalBonus);
                frm.refresh_field("bonus_amount");
            }
        } 
    }
});

frappe.ui.form.on('Attendance Request', {
	before_save(frm) {
		if(frm.doc.reason == "Early Going" || frm.doc.reason == "Late Coming" || frm.doc.reason == "Missed Punch In" || frm.doc.reason == "Missed Punch Out"){
            if(frm.doc.from_date !== frm.doc.to_date){
                frappe.throw({
                    title: __('Validation'),
                    message: __('From Date and To Date must be the same for selected reason'),
                    indicator: 'orange'
                });
            }
        }
	},
    custom_checkin_time(frm) {
        let from_date = frm.doc.from_date;
        let checkin_datetime = frm.doc.custom_checkin_time;

        if (from_date && checkin_datetime) {
            let fromDateObj = new Date(from_date);
            fromDateObj.setHours(0, 0, 0, 0); // Normalize to midnight
            
            let checkinDateObj = new Date(checkin_datetime);

            console.log("From Date:", fromDateObj);
            console.log("Check-in Date:", checkinDateObj);

            // Extract only the date part
            let fromDateStr = from_date; // YYYY-MM-DD
            let checkinDateStr = checkin_datetime.split(' ')[0]; // Extract only the date part

            if (checkinDateStr !== fromDateStr) {
                frappe.throw(__('Check-in date must match From Date.'));
                frm.set_value("custom_checkin_time", "");
                frm.refresh_field("custom_checkin_time");
            }
        }
    },
    custom_checkout_time(frm) {
        let from_date = frm.doc.from_date;
        let checkout_datetime = frm.doc.custom_checkout_time;

        if (from_date && checkout_datetime) {
            let fromDateObj = new Date(from_date);
            fromDateObj.setHours(0, 0, 0, 0); // Normalize to midnight
            
            let checkoutDateObj = new Date(checkout_datetime);

            console.log("From Date:", fromDateObj);
            console.log("Check-out Date:", checkoutDateObj);

            // Extract only the date part
            let fromDateStr = from_date; // YYYY-MM-DD
            let checkoutDateStr = checkout_datetime.split(' ')[0]; // Extract only the date part

            if (checkoutDateStr !== fromDateStr) {
                frappe.throw(__('Check-Out date must match From Date.'));
                frm.set_value("custom_checkout_time", "");
                frm.refresh_field("custom_checkout_time");
            }
        }
    }
})