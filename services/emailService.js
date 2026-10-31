import nodemailer from "nodemailer";
import "dotenv/config";

const zohoEmail = process.env.ZOHO_EMAIL?.trim();
const zohoPassword = process.env.ZOHO_APP_PASSWORD?.trim();

if (!zohoEmail || !zohoPassword) {
  throw new Error(
    "Zoho SMTP credentials are missing in emailService.js"
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: zohoEmail,
    pass: zohoPassword,
  },
});

export const sendStaffWelcomeEmail = async ({
  email,
  fullName,
  role,
  staffCode,
  password,
  approvalStatus
}) => {

  const isPending = approvalStatus === "PENDING";

  const mailOptions = {
    from: `"ToOseA Garden" <${process.env.ZOHO_EMAIL}>`,
    to: email,

    subject: isPending
      ? "Your ToOseA Garden Staff Account - Pending Approval"
      : "Welcome to ToOseA Garden - Your Staff Account",

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>ToOseA Garden Staff Account</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f7faf8;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            color: #39453f;
          "
        >

          <!-- Main Container -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              background-color: #f7faf8;
              padding: 40px 15px;
            "
          >
            <tr>
              <td align="center">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    max-width: 620px;
                    background-color: #ffffff;
                    border-radius: 14px;
                    overflow: hidden;
                    border: 1px solid #dce7e1;
                  "
                >

                  <!-- Header -->
                  <tr>
                    <td
                      style="
                        background-color: #063b2a;
                        padding: 32px 30px;
                        text-align: center;
                      "
                    >

                      <h1
                        style="
                          margin: 0;
                          color: #ffffff;
                          font-size: 28px;
                          font-weight: 700;
                          letter-spacing: 0.3px;
                        "
                      >
                        ToOseA Garden
                      </h1>

                      <p
                        style="
                          margin: 8px 0 0;
                          color: #eaf5ef;
                          font-size: 14px;
                        "
                      >
                        Staff Management System
                      </p>

                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td
                      style="
                        padding: 35px 30px;
                      "
                    >

                      <h2
                        style="
                          margin: 0 0 12px;
                          color: #17221d;
                          font-size: 23px;
                          font-weight: 700;
                        "
                      >
                        Welcome, ${fullName}
                      </h2>

                      <p
                        style="
                          margin: 0 0 20px;
                          color: #39453f;
                          font-size: 15px;
                          line-height: 1.7;
                        "
                      >
                        Your staff account has been created
                        for <strong>ToOseA Garden</strong>.
                        Below are your account details.
                      </p>

                      <!-- Account Details -->
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          background-color: #eaf5ef;
                          border: 1px solid #dce7e1;
                          border-radius: 8px;
                          margin: 25px 0;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding: 22px;
                            "
                          >

                            <p
                              style="
                                margin: 0 0 14px;
                                color: #68736d;
                                font-size: 13px;
                              "
                            >
                              STAFF DETAILS
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                color: #39453f;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Staff Code:
                              </strong>

                              ${staffCode}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                color: #39453f;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Role:
                              </strong>

                              ${role}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                color: #39453f;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Email:
                              </strong>

                              ${email}
                            </p>

                            <p
                              style="
                                margin: 0;
                                color: #39453f;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Temporary Password:
                              </strong>

                              ${password}
                            </p>

                          </td>
                        </tr>
                      </table>

                      ${
                        isPending
                          ? `
                            <!-- Pending Notice -->

                            <table
                              width="100%"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              style="
                                background-color: #fff8e8;
                                border-left: 4px solid #b26a00;
                                margin: 20px 0;
                              "
                            >
                              <tr>
                                <td
                                  style="
                                    padding: 15px 18px;
                                  "
                                >

                                  <p
                                    style="
                                      margin: 0;
                                      color: #6b4a00;
                                      font-size: 14px;
                                      line-height: 1.6;
                                    "
                                  >
                                    <strong>
                                      Account Pending Approval
                                    </strong>
                                    <br />

                                    Your account has been
                                    created but is currently
                                    awaiting approval from
                                    the administrator.
                                  </p>

                                </td>
                              </tr>
                            </table>
                          `
                          : `
                            <!-- Approved Notice -->

                            <table
                              width="100%"
                              cellpadding="0"
                              cellspacing="0"
                              border="0"
                              style="
                                background-color: #eaf5ef;
                                border-left: 4px solid #0b6b45;
                                margin: 20px 0;
                              "
                            >
                              <tr>
                                <td
                                  style="
                                    padding: 15px 18px;
                                  "
                                >

                                  <p
                                    style="
                                      margin: 0;
                                      color: #075437;
                                      font-size: 14px;
                                      line-height: 1.6;
                                    "
                                  >
                                    <strong>
                                      Your account is ready
                                    </strong>
                                    <br />

                                    You can now log in using
                                    the credentials provided
                                    above.
                                  </p>

                                </td>
                              </tr>
                            </table>
                          `
                      }

                      <!-- Security Notice -->

                      <p
                        style="
                          margin: 25px 0 0;
                          color: #68736d;
                          font-size: 13px;
                          line-height: 1.7;
                        "
                      >
                        <strong
                          style="color: #39453f;"
                        >
                          Security notice:
                        </strong>

                        For your security, you will be
                        required to change your temporary
                        password after your first login.
                      </p>

                      <p
                        style="
                          margin: 18px 0 0;
                          color: #68736d;
                          font-size: 13px;
                          line-height: 1.7;
                        "
                      >
                        If you did not expect this account,
                        please contact the ToOseA Garden
                        administrator immediately.
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td
                      style="
                        background-color: #063b2a;
                        padding: 25px 30px;
                        text-align: center;
                      "
                    >

                      <p
                        style="
                          margin: 0 0 6px;
                          color: #ffffff;
                          font-size: 15px;
                          font-weight: 600;
                        "
                      >
                        ToOseA Garden
                      </p>

                      <p
                        style="
                          margin: 0;
                          color: #eaf5ef;
                          font-size: 12px;
                          line-height: 1.6;
                        "
                      >
                        This is an automated email.
                        Please do not reply directly to
                        this message.
                      </p>

                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};


export const sendBookingConfirmationEmail = async ({
  email,
  fullName,
  bookingReference,
  apartmentName,
  apartmentCode,
  checkInDate,
  checkOutDate,
  totalPrice,
  paymentStatus,
  bookingStatus
}) => {

  const mailOptions = {
    from: `"ToOseA Garden" <${process.env.ZOHO_EMAIL}>`,
    to: email,

    subject: `Booking Confirmed - ${bookingReference}`,

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Booking Confirmation</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f7faf8;
            font-family: Arial, Helvetica, sans-serif;
            color: #39453f;
          "
        >

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              background-color: #f7faf8;
              padding: 40px 15px;
            "
          >
            <tr>
              <td align="center">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    max-width: 620px;
                    background-color: #ffffff;
                    border-radius: 14px;
                    overflow: hidden;
                    border: 1px solid #dce7e1;
                  "
                >

                  <!-- HEADER -->

                  <tr>
                    <td
                      style="
                        background-color: #063b2a;
                        padding: 32px 30px;
                        text-align: center;
                      "
                    >

                      <h1
                        style="
                          margin: 0;
                          color: #ffffff;
                          font-size: 28px;
                          font-weight: 700;
                        "
                      >
                        ToOseA Garden
                      </h1>

                      <p
                        style="
                          margin: 8px 0 0;
                          color: #eaf5ef;
                          font-size: 14px;
                        "
                      >
                        Your comfort, our priority
                      </p>

                    </td>
                  </tr>


                  <!-- CONTENT -->

                  <tr>
                    <td style="padding: 35px 30px;">

                      <h2
                        style="
                          margin: 0 0 12px;
                          color: #17221d;
                          font-size: 23px;
                        "
                      >
                        Booking Confirmed!
                      </h2>

                      <p
                        style="
                          margin: 0 0 20px;
                          color: #39453f;
                          font-size: 15px;
                          line-height: 1.7;
                        "
                      >
                        Dear <strong>${fullName}</strong>,
                      </p>

                      <p
                        style="
                          margin: 0 0 25px;
                          color: #39453f;
                          font-size: 15px;
                          line-height: 1.7;
                        "
                      >
                        Thank you for choosing
                        <strong>ToOseA Garden</strong>.
                        Your room booking has been successfully
                        confirmed.
                      </p>


                      <!-- CONFIRMED BADGE -->

                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          background-color: #eaf5ef;
                          border: 1px solid #dce7e1;
                          border-radius: 8px;
                          margin-bottom: 25px;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding: 18px;
                              text-align: center;
                            "
                          >

                            <p
                              style="
                                margin: 0;
                                color: #0b6b45;
                                font-size: 18px;
                                font-weight: 700;
                              "
                            >
                              ✓ BOOKING CONFIRMED
                            </p>

                          </td>
                        </tr>
                      </table>


                      <!-- BOOKING DETAILS -->

                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          background-color: #f7faf8;
                          border: 1px solid #dce7e1;
                          border-radius: 8px;
                          margin-bottom: 25px;
                        "
                      >
                        <tr>
                          <td style="padding: 22px;">

                            <p
                              style="
                                margin: 0 0 16px;
                                color: #68736d;
                                font-size: 13px;
                              "
                            >
                              BOOKING DETAILS
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Booking Reference:
                              </strong>
                              ${bookingReference}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Apartment:
                              </strong>
                              ${apartmentName}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Apartment Code:
                              </strong>
                              ${apartmentCode}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Check-in:
                              </strong>
                              ${checkInDate}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Check-out:
                              </strong>
                              ${checkOutDate}
                            </p>

                            <p
                              style="
                                margin: 0 0 12px;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Payment:
                              </strong>

                              <span
                                style="
                                  color: #0b6b45;
                                  font-weight: 600;
                                "
                              >
                                ${paymentStatus}
                              </span>
                            </p>

                            <p
                              style="
                                margin: 0;
                                font-size: 15px;
                              "
                            >
                              <strong
                                style="color: #17221d;"
                              >
                                Booking Status:
                              </strong>

                              ${bookingStatus}
                            </p>

                          </td>
                        </tr>
                      </table>


                      <!-- TOTAL -->

                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          background-color: #063b2a;
                          border-radius: 8px;
                          margin-bottom: 25px;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding: 20px;
                              text-align: center;
                            "
                          >

                            <p
                              style="
                                margin: 0 0 6px;
                                color: #eaf5ef;
                                font-size: 13px;
                              "
                            >
                              TOTAL AMOUNT PAID
                            </p>

                            <p
                              style="
                                margin: 0;
                                color: #ffffff;
                                font-size: 25px;
                                font-weight: 700;
                              "
                            >
                              ₦${Number(totalPrice).toLocaleString()}
                            </p>

                          </td>
                        </tr>
                      </table>


                      <!-- CHECK-IN INFORMATION -->

                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          background-color: #eaf5ef;
                          border-left: 4px solid #0b6b45;
                          margin-bottom: 25px;
                        "
                      >
                        <tr>
                          <td style="padding: 16px 18px;">

                            <p
                              style="
                                margin: 0 0 8px;
                                color: #075437;
                                font-size: 15px;
                                font-weight: 700;
                              "
                            >
                              Check-in Information
                            </p>

                            <p
                              style="
                                margin: 0;
                                color: #39453f;
                                font-size: 14px;
                                line-height: 1.7;
                              "
                            >
                              Please present your booking
                              reference and a valid means of
                              identification when you arrive
                              at ToOseA Garden.
                            </p>

                          </td>
                        </tr>
                      </table>


                      <p
                        style="
                          margin: 0;
                          color: #68736d;
                          font-size: 13px;
                          line-height: 1.7;
                        "
                      >
                        Please keep this email for your records.
                        If you have any questions regarding your
                        booking, please contact ToOseA Garden.
                      </p>

                    </td>
                  </tr>


                  <!-- FOOTER -->

                  <tr>
                    <td
                      style="
                        background-color: #063b2a;
                        padding: 25px 30px;
                        text-align: center;
                      "
                    >

                      <p
                        style="
                          margin: 0 0 6px;
                          color: #ffffff;
                          font-size: 15px;
                          font-weight: 600;
                        "
                      >
                        ToOseA Garden
                      </p>

                      <p
                        style="
                          margin: 0;
                          color: #eaf5ef;
                          font-size: 12px;
                          line-height: 1.6;
                        "
                      >
                        Thank you for choosing ToOseA Garden.
                      </p>

                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};