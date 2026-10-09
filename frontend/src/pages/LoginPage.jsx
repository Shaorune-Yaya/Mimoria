import {
  useEffect,
  useState,
} from "react";

import {
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
        setErrorMessage(
          t(
            "auth.emailNotVerified"
          )
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
    <div className="app">
      <main
        className="main-content"
        style={{
          maxWidth:
            "520px",

          margin:
            "0 auto",

          paddingTop:
            "80px",
        }}
      >
        <div
          className="page-header"
          style={{
            display:
              "block",

            textAlign:
              "center",
          }}
        >
          <h1>
            Mimoria
          </h1>


          <p>
            {t(
              "auth.loginSubtitle"
            )}
          </p>
        </div>


        <div className="create-panel">
          <h2>
            {t(
              "auth.login"
            )}
          </h2>


          <form
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
              onChange={(
                event
              ) =>
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
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
            />


            {errorMessage && (
              <div
                className="error-message"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                {
                  errorMessage
                }
              </div>
            )}


            <div
              className="form-buttons"
              style={{
                marginTop:
                  "20px",
              }}
            >
              <button
                type="submit"
                className="save-button"
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
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}