import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  useAuth,
} from "../auth/AuthContext";


const DEFAULT_RESEND_COOLDOWN =
  60;


export default function VerifyEmailPage() {
  const {
    t,
  } =
    useTranslation();


  const {
    authenticated,
    loading,
    verifyEmail,
    resendVerification,
  } =
    useAuth();


  const navigate =
    useNavigate();


  const location =
    useLocation();


  const [
    email,
    setEmail,
  ] =
    useState(
      location.state
        ?.email ||
      ""
    );


  const [
    code,
    setCode,
  ] =
    useState(
      ""
    );


  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false
    );


  const [
    resending,
    setResending,
  ] =
    useState(
      false
    );


  const [
    resendSeconds,
    setResendSeconds,
  ] =
    useState(
      location.state
        ?.verificationJustSent
        ? DEFAULT_RESEND_COOLDOWN
        : 0
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      location.state
        ?.emailDeliveryFailed
        ? t(
            "auth.verificationEmailFailed"
          )
        : ""
    );


  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState(
      location.state
        ?.verificationJustSent
        ? t(
            "auth.verificationSent"
          )
        : ""
    );


  // ====================================================
  // Already Logged In
  // ====================================================

  useEffect(
    () => {
      if (
        !loading &&
        authenticated
      ) {
        navigate(
          "/",
          {
            replace:
              true,
          }
        );
      }
    },
    [
      authenticated,
      loading,
      navigate,
    ]
  );


  // ====================================================
  // Resend Countdown
  // ====================================================

  useEffect(
    () => {
      if (
        resendSeconds <=
        0
      ) {
        return;
      }


      const timer =
        window.setInterval(
          () => {
            setResendSeconds(
              (current) =>
                Math.max(
                  0,
                  current - 1
                )
            );
          },
          1000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      resendSeconds,
    ]
  );


  // ====================================================
  // Verification
  // ====================================================

  async function handleVerify(
    event
  ) {
    event.preventDefault();


    const normalizedEmail =
      email.trim();


    const normalizedCode =
      code
        .replace(
          /\D/gu,
          ""
        )
        .slice(
          0,
          6
        );


    if (
      !normalizedEmail ||
      normalizedCode.length !==
        6 ||
      submitting
    ) {
      return;
    }


    try {
      setSubmitting(
        true
      );


      setErrorMessage(
        ""
      );


      setStatusMessage(
        ""
      );


      const data =
        await verifyEmail({
          email:
            normalizedEmail,

          code:
            normalizedCode,
      });


      if (
        data?.authenticated
      ) {
        navigate(
          "/",
          {
            replace:
              true,
          }
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Email verification failed:",
        error
      );


      if (
        error.code ===
        "INCORRECT_VERIFICATION_CODE"
      ) {
        setErrorMessage(
          t(
            "auth.incorrectVerificationCode"
          )
        );
      } else if (
        error.code ===
        "VERIFICATION_CODE_EXPIRED"
      ) {
        setErrorMessage(
          t(
            "auth.verificationExpired"
          )
        );
      } else if (
        error.code ===
        "VERIFICATION_ATTEMPTS_EXCEEDED"
      ) {
        setErrorMessage(
          t(
            "auth.verificationAttemptsExceeded"
          )
        );
      } else if (
        error.code ===
        "EMAIL_ALREADY_VERIFIED"
      ) {
        navigate(
          "/login",
          {
            replace:
              true,

            state: {
              notice:
                t(
                  "auth.alreadyVerifiedLogin"
                ),
            },
          }
        );
      } else {
        setErrorMessage(
          error.message ||
          t(
            "auth.verificationFailed"
          )
        );
      }
    } finally {
      setSubmitting(
        false
      );
    }
  }


  // ====================================================
  // Resend
  // ====================================================

  async function handleResend() {
    const normalizedEmail =
      email.trim();


    if (
      !normalizedEmail ||
      resending ||
      resendSeconds >
        0
    ) {
      return;
    }


    try {
      setResending(
        true
      );


      setErrorMessage(
        ""
      );


      setStatusMessage(
        ""
      );


      const data =
        await resendVerification({
          email:
            normalizedEmail,
        });


      if (
        data?.alreadyVerified
      ) {
        navigate(
          "/login",
          {
            replace:
              true,

            state: {
              notice:
                t(
                  "auth.alreadyVerifiedLogin"
                ),
            },
          }
        );


        return;
      }


      setStatusMessage(
        t(
          "auth.verificationSent"
        )
      );


      setResendSeconds(
        DEFAULT_RESEND_COOLDOWN
      );
    } catch (
      error
    ) {
      console.error(
        "Resend verification failed:",
        error
      );


      if (
        error.code ===
        "VERIFICATION_RESEND_COOLDOWN"
      ) {
        const retryAfter =
          Number(
            error.retryAfterSeconds
          );


        setResendSeconds(
          Number.isFinite(
            retryAfter
          )
            ? retryAfter
            : DEFAULT_RESEND_COOLDOWN
        );


        setErrorMessage(
          t(
            "auth.resendCooldown"
          )
        );
      } else {
        setErrorMessage(
          error.message ||
          t(
            "auth.resendFailed"
          )
        );
      }
    } finally {
      setResending(
        false
      );
    }
  }


  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="auth-page">
      <main className="auth-container">
        <div className="auth-brand">
          <h1>
            {t(
              "app.name"
            )}
          </h1>

          <p>
            {t(
              "auth.verifySubtitle"
            )}
          </p>
        </div>


        <section className="auth-card">
          <div className="auth-card-header">
            <h2>
              {t(
                "auth.verifyEmail"
              )}
            </h2>

            <p>
              {t(
                "auth.verifyDescription"
              )}
            </p>
          </div>


          <form
            className="auth-form"
            onSubmit={
              handleVerify
            }
          >
            <label
              htmlFor="verify-email"
            >
              {t(
                "auth.email"
              )}
            </label>

            <input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={
                email
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.emailPlaceholder"
              )}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
            />


            <label
              htmlFor="verify-code"
            >
              {t(
                "auth.verificationCode"
              )}
            </label>

            <input
              id="verify-code"
              className="auth-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={
                code
              }
              disabled={
                submitting
              }
              placeholder="000000"
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(
                      /\D/gu,
                      ""
                    )
                    .slice(
                      0,
                      6
                    )
                )
              }
            />


            {statusMessage && (
              <div className="auth-success">
                {
                  statusMessage
                }
              </div>
            )}


            {errorMessage && (
              <div className="auth-error">
                {
                  errorMessage
                }
              </div>
            )}


            <button
              type="submit"
              className="auth-primary-button"
              disabled={
                submitting ||
                !email.trim() ||
                code.length !==
                  6
              }
            >
              {submitting
                ? t(
                    "auth.verifying"
                  )
                : t(
                    "auth.verify"
                  )}
            </button>
          </form>


          <div className="auth-resend">
            <span>
              {t(
                "auth.didNotReceiveCode"
              )}
            </span>

            <button
              type="button"
              className="auth-text-button"
              disabled={
                resending ||
                resendSeconds >
                  0 ||
                !email.trim()
              }
              onClick={
                handleResend
              }
            >
              {resending
                ? t(
                    "auth.resending"
                  )
                : resendSeconds >
                    0
                  ? t(
                      "auth.resendIn",
                      {
                        seconds:
                          resendSeconds,
                      }
                    )
                  : t(
                      "auth.resendCode"
                    )}
            </button>
          </div>


          <div className="auth-footer">
            <Link
              to="/login"
              className="auth-link"
            >
              {t(
                "auth.backToLogin"
              )}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}