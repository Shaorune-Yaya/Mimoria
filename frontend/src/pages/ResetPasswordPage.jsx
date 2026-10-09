import {
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


export default function ResetPasswordPage() {
  const {
    t,
  } =
    useTranslation();


  const {
    resetPassword,
  } =
    useAuth();


  const location =
    useLocation();


  const navigate =
    useNavigate();


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
    password,
    setPassword,
  ] =
    useState(
      ""
    );


  const [
    confirmPassword,
    setConfirmPassword,
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


    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        t(
          "auth.passwordMismatch"
        )
      );


      return;
    }


    try {
      setSubmitting(
        true
      );


      setErrorMessage(
        ""
      );


      await resetPassword({
        email:
          email.trim(),

        code,

        newPassword:
          password,
      });


      navigate(
        "/login",
        {
          replace:
            true,

          state: {
            notice:
              t(
                "auth.passwordResetSuccess"
              ),
          },
        }
      );
    } catch (
      error
    ) {
      setErrorMessage(
        error.message ||
        t(
          "auth.passwordResetFailed"
        )
      );
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
              "auth.resetPasswordSubtitle"
            )}
          </p>
        </div>


        <section className="auth-card">
          <div className="auth-card-header">
            <h2>
              {t(
                "auth.resetPassword"
              )}
            </h2>
          </div>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            <label htmlFor="reset-email">
              {t(
                "auth.email"
              )}
            </label>

            <input
              id="reset-email"
              type="email"
              value={
                email
              }
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
            />


            <label htmlFor="reset-code">
              {t(
                "auth.verificationCode"
              )}
            </label>

            <input
              id="reset-code"
              className="auth-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={
                code
              }
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


            <label htmlFor="reset-password">
              {t(
                "auth.newPassword"
              )}
            </label>

            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={
                password
              }
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
            />


            <label htmlFor="reset-confirm-password">
              {t(
                "auth.confirmPassword"
              )}
            </label>

            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
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
                !email.trim() ||
                code.length !==
                  6 ||
                !password ||
                !confirmPassword
              }
            >
              {submitting
                ? t(
                    "auth.resettingPassword"
                  )
                : t(
                    "auth.resetPassword"
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