import {
  useEffect,
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


export default function RegisterPage() {
  const {
    t,
  } =
    useTranslation();


  const {
    authenticated,
    loading,
    register,
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
    username,
    setUsername,
  ] =
    useState(
      ""
    );


  const [
    displayName,
    setDisplayName,
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
    inviteCode,
    setInviteCode,
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
  // Register
  // ====================================================

  async function handleSubmit(
    event
  ) {
    event.preventDefault();


    const normalizedEmail =
      email.trim();


    const normalizedUsername =
      username.trim();


    const normalizedInviteCode =
      inviteCode.trim();


    if (
      !normalizedEmail ||
      !normalizedUsername ||
      !password ||
      !confirmPassword ||
      !normalizedInviteCode ||
      submitting
    ) {
      return;
    }


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


      await register({
        email:
          normalizedEmail,

        username:
          normalizedUsername,

        displayName:
          displayName
            .trim(),

        password,

        inviteCode:
          normalizedInviteCode,
      });


      navigate(
        "/verify-email",
        {
          replace:
            true,

          state: {
            email:
              normalizedEmail,

            verificationJustSent:
              true,
          },
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Registration failed:",
        error
      );


      /*
       * The account already exists when this error occurs.
       * Let the user continue to the verification page and
       * request another code.
       */
      if (
        error.code ===
        "VERIFICATION_EMAIL_FAILED"
      ) {
        navigate(
          "/verify-email",
          {
            replace:
              true,

            state: {
              email:
                normalizedEmail,

              emailDeliveryFailed:
                true,
            },
          }
        );


        return;
      }


      if (
        error.code ===
        "EMAIL_ALREADY_REGISTERED"
      ) {
        setErrorMessage(
          t(
            "auth.emailAlreadyRegistered"
          )
        );
      } else if (
        error.code ===
        "USERNAME_ALREADY_TAKEN"
      ) {
        setErrorMessage(
          t(
            "auth.usernameAlreadyTaken"
          )
        );
      } else {
        setErrorMessage(
          error.message ||
          t(
            "auth.registrationFailed"
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
              "auth.registerSubtitle"
            )}
          </p>
        </div>


        <section className="auth-card">
          <div className="auth-card-header">
            <h2>
              {t(
                "auth.register"
              )}
            </h2>

            <p>
              {t(
                "auth.betaRegistrationDescription"
              )}
            </p>
          </div>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            <label
              htmlFor="register-email"
            >
              {t(
                "auth.email"
              )}
            </label>

            <input
              id="register-email"
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


            <label
              htmlFor="register-username"
            >
              {t(
                "auth.username"
              )}
            </label>

            <input
              id="register-username"
              type="text"
              autoComplete="username"
              value={
                username
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.usernamePlaceholder"
              )}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
            />


            <label
              htmlFor="register-display-name"
            >
              {t(
                "auth.displayName"
              )}

              <span className="auth-optional">
                {t(
                  "auth.optional"
                )}
              </span>
            </label>

            <input
              id="register-display-name"
              type="text"
              autoComplete="name"
              value={
                displayName
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.displayNamePlaceholder"
              )}
              onChange={(event) =>
                setDisplayName(
                  event.target.value
                )
              }
            />


            <label
              htmlFor="register-password"
            >
              {t(
                "auth.password"
              )}
            </label>

            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
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


            <label
              htmlFor="register-confirm-password"
            >
              {t(
                "auth.confirmPassword"
              )}
            </label>

            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              value={
                confirmPassword
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.confirmPasswordPlaceholder"
              )}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />


            <label
              htmlFor="register-invite-code"
            >
              {t(
                "auth.inviteCode"
              )}
            </label>

            <input
              id="register-invite-code"
              type="text"
              autoComplete="off"
              value={
                inviteCode
              }
              disabled={
                submitting
              }
              placeholder={t(
                "auth.inviteCodePlaceholder"
              )}
              onChange={(event) =>
                setInviteCode(
                  event.target.value
                )
              }
            />


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
                !username.trim() ||
                !password ||
                !confirmPassword ||
                !inviteCode.trim()
              }
            >
              {submitting
                ? t(
                    "auth.registering"
                  )
                : t(
                    "auth.createAccount"
                  )}
            </button>
          </form>


          <div className="auth-footer">
            <span>
              {t(
                "auth.alreadyHaveAccount"
              )}
            </span>

            <Link
              to="/login"
              className="auth-link"
            >
              {t(
                "auth.login"
              )}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}