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


export default function LoginPage() {
  const {
    t,
  } =
    useTranslation();


  const {
    authenticated,
    loading,
    login,
  } =
    useAuth();


  const navigate =
    useNavigate();


  const location =
    useLocation();


  const [
    identifier,
    setIdentifier,
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


  const destination =
    location.state
      ?.from ||
    "/";


  const notice =
    location.state
      ?.notice ||
    "";


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
          destination,
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
      destination,
    ]
  );


  // ====================================================
  // Login
  // ====================================================

  async function handleSubmit(
    event
  ) {
    event.preventDefault();


    const normalizedIdentifier =
      identifier.trim();


    if (
      !normalizedIdentifier ||
      !password ||
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


      await login({
        identifier:
          normalizedIdentifier,

        password,
      });


      navigate(
        destination,
        {
          replace:
            true,
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Login failed:",
        error
      );


      if (
        error.code ===
        "INVALID_CREDENTIALS"
      ) {
        setErrorMessage(
          t(
            "auth.invalidCredentials"
          )
        );
      } else if (
        error.code ===
        "EMAIL_NOT_VERIFIED"
      ) {
        /*
         * If the user logged in with an email address we
         * already know where to send them.
         *
         * Username login can still open the verification
         * page and enter the email manually.
         */
        navigate(
          "/verify-email",
          {
            state: {
              email:
                normalizedIdentifier.includes(
                  "@"
                )
                  ? normalizedIdentifier
                  : "",
            },
          }
        );
      } else if (
        error.status ===
        403
      ) {
        setErrorMessage(
          error.message ||
          t(
            "auth.accountUnavailable"
          )
        );
      } else {
        setErrorMessage(
          error.message ||
          t(
            "auth.loginFailed"
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
              "auth.loginSubtitle"
            )}
          </p>
        </div>


        <section className="auth-card">
          <div className="auth-card-header">
            <h2>
              {t(
                "auth.login"
              )}
            </h2>
          </div>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            <label
              htmlFor="login-identifier"
            >
              {t(
                "auth.identifier"
              )}
            </label>

            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              autoFocus
              value={
                identifier
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.identifierPlaceholder"
              )}
              onChange={(event) =>
                setIdentifier(
                  event.target.value
                )
              }
            />


            <label
              htmlFor="login-password"
            >
              {t(
                "auth.password"
              )}
            </label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={
                password
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.passwordPlaceholder"
              )}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
            />
            <div className="auth-password-actions">
              <Link
                to="/forgot-password"
                className="auth-link"
              >
                {t(
                  "auth.forgotPassword"
                )}
              </Link>
            </div>

            {notice && (
              <div className="auth-success">
                {
                  notice
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
                !identifier.trim() ||
                !password
              }
            >
              {submitting
                ? t(
                    "auth.loggingIn"
                  )
                : t(
                    "auth.login"
                  )}
            </button>
          </form>


          <div className="auth-footer">
            <span>
              {t(
                "auth.noAccount"
              )}
            </span>

            <Link
              to="/register"
              className="auth-link"
            >
              {t(
                "auth.register"
              )}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}