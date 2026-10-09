import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  useAuth,
} from "../auth/AuthContext";


export default function ForgotPasswordPage() {
  const {
    t,
  } =
    useTranslation();


  const {
    requestPasswordReset,
  } =
    useAuth();


  const navigate =
    useNavigate();


  const [
    email,
    setEmail,
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
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  async function handleSubmit(
    event
  ) {
    event.preventDefault();


    const normalizedEmail =
      email.trim();


    if (
      !normalizedEmail ||
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


      await requestPasswordReset({
        email:
          normalizedEmail,
      });


      navigate(
        "/reset-password",
        {
          state: {
            email:
              normalizedEmail,

            codeSent:
              true,
          },
        }
      );
    } catch (
      error
    ) {
      if (
        error.code ===
        "PASSWORD_RESET_COOLDOWN"
      ) {
        setErrorMessage(
          t(
            "auth.passwordResetCooldown"
          )
        );
      } else {
        setErrorMessage(
          error.message ||
          t(
            "auth.passwordResetRequestFailed"
          )
        );
      }
    } finally {
      setSubmitting(
        false
      );
    }
  }


  return (
    <div className="auth-page">
      <main className="auth-container">
        <div className="auth-brand">
          <h1>
            Mimoria
          </h1>

          <p>
            {t(
              "auth.forgotPasswordSubtitle"
            )}
          </p>
        </div>


        <section className="auth-card">
          <div className="auth-card-header">
            <h2>
              {t(
                "auth.forgotPassword"
              )}
            </h2>

            <p>
              {t(
                "auth.forgotPasswordDescription"
              )}
            </p>
          </div>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            <label htmlFor="forgot-email">
              {t(
                "auth.email"
              )}
            </label>

            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
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


            {errorMessage && (
              <div className="auth-error">
                {errorMessage}
              </div>
            )}


            <button
              type="submit"
              className="auth-primary-button"
              disabled={
                submitting ||
                !email.trim()
              }
            >
              {submitting
                ? t(
                    "auth.sendingResetCode"
                  )
                : t(
                    "auth.sendResetCode"
                  )}
            </button>
          </form>


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