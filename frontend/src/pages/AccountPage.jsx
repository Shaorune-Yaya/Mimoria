import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import AppHeader from "../components/AppHeader";

import {
  useAuth,
} from "../auth/AuthContext";


export default function AccountPage() {
  const {
    t,
    i18n,
  } =
    useTranslation();


  const navigate =
    useNavigate();


  const {
    user,
    changePassword,
    logout,
  } =
    useAuth();


  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState(
      ""
    );


  const [
    newPassword,
    setNewPassword,
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
    changingPassword,
    setChangingPassword,
  ] =
    useState(
      false
    );


  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(
      false
    );


  const [
    passwordError,
    setPasswordError,
  ] =
    useState(
      ""
    );


  const [
    passwordSuccess,
    setPasswordSuccess,
  ] =
    useState(
      ""
    );


  // ======================================================
  // Helpers
  // ======================================================

  function formatDate(
    value
  ) {
    if (
      !value
    ) {
      return "—";
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }


    return date.toLocaleString(
      i18n.language ===
        "zh-CN"
        ? "zh-CN"
        : "en-US"
    );
  }


  // ======================================================
  // Change Password
  // ======================================================

  async function handleChangePassword(
    event
  ) {
    event.preventDefault();


    if (
      changingPassword
    ) {
      return;
    }


    setPasswordError(
      ""
    );


    setPasswordSuccess(
      ""
    );


    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        t(
          "auth.passwordFieldsRequired"
        )
      );


      return;
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        t(
          "auth.passwordMismatch"
        )
      );


      return;
    }


    if (
      newPassword.length <
      8
    ) {
      setPasswordError(
        t(
          "auth.passwordTooShort"
        )
      );


      return;
    }


    if (
      newPassword.length >
      128
    ) {
      setPasswordError(
        t(
          "auth.passwordTooLong"
        )
      );


      return;
    }


    if (
      currentPassword ===
      newPassword
    ) {
      setPasswordError(
        t(
          "auth.passwordMustBeDifferent"
        )
      );


      return;
    }


    try {
      setChangingPassword(
        true
      );


      await changePassword({
        currentPassword,
        newPassword,
      });


      setCurrentPassword(
        ""
      );


      setNewPassword(
        ""
      );


      setConfirmPassword(
        ""
      );


      setPasswordSuccess(
        t(
          "auth.passwordChanged"
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Password change failed:",
        error
      );


      if (
        error.code ===
        "CURRENT_PASSWORD_INCORRECT"
      ) {
        setPasswordError(
          t(
            "auth.currentPasswordIncorrect"
          )
        );
      } else if (
        error.code ===
        "PASSWORD_TOO_SHORT"
      ) {
        setPasswordError(
          t(
            "auth.passwordTooShort"
          )
        );
      } else if (
        error.code ===
        "PASSWORD_TOO_LONG"
      ) {
        setPasswordError(
          t(
            "auth.passwordTooLong"
          )
        );
      } else if (
        error.code ===
        "PASSWORD_UNCHANGED"
      ) {
        setPasswordError(
          t(
            "auth.passwordMustBeDifferent"
          )
        );
      } else {
        setPasswordError(
          error.message ||
          t(
            "auth.passwordChangeFailed"
          )
        );
      }
    } finally {
      setChangingPassword(
        false
      );
    }
  }


  // ======================================================
  // Logout
  // ======================================================

  async function handleLogout() {
    if (
      loggingOut
    ) {
      return;
    }


    try {
      setLoggingOut(
        true
      );


      await logout();


      navigate(
        "/login",
        {
          replace:
            true,
        }
      );
    } finally {
      setLoggingOut(
        false
      );
    }
  }


  // ======================================================
  // Render
  // ======================================================

  return (
    <div className="app account-page">
      <AppHeader
        showBackButton
        backTo="/"
      />


      <main className="account-content">
        <div className="account-page-header">
          <div>
            <h1>
              {t(
                "account.title"
              )}
            </h1>

            <p>
              {t(
                "account.subtitle"
              )}
            </p>
          </div>
        </div>


        <div className="account-layout">
          {/* ==================================================
              Profile
              ================================================== */}

          <section className="account-card">
            <div className="account-card-header">
              <div>
                <h2>
                  {t(
                    "account.profile"
                  )}
                </h2>

                <p>
                  {t(
                    "account.profileDescription"
                  )}
                </p>
              </div>


              <div className="account-profile-avatar">
                {(
                  user
                    ?.displayName ||
                  user
                    ?.username ||
                  "M"
                )
                  .slice(
                    0,
                    1
                  )
                  .toUpperCase()}
              </div>
            </div>


            <div className="account-info-list">
              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.displayName"
                  )}
                </div>

                <div className="account-info-value">
                  {user
                    ?.displayName ||
                    "—"}
                </div>
              </div>


              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.username"
                  )}
                </div>

                <div className="account-info-value">
                  {user
                    ?.username
                    ? `@${user.username}`
                    : "—"}
                </div>
              </div>


              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.email"
                  )}
                </div>

                <div className="account-info-value account-info-value-with-badge">
                  <span>
                    {user
                      ?.email ||
                      "—"}
                  </span>


                  {user
                    ?.emailVerified && (
                    <span className="account-status-badge success">
                      {t(
                        "account.verified"
                      )}
                    </span>
                  )}
                </div>
              </div>


              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.role"
                  )}
                </div>

                <div className="account-info-value">
                  <span className="account-status-badge">
                    {user
                      ?.role ===
                      "admin"
                      ? t(
                          "account.admin"
                        )
                      : t(
                          "account.user"
                        )}
                  </span>
                </div>
              </div>


              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.createdAt"
                  )}
                </div>

                <div className="account-info-value">
                  {formatDate(
                    user
                      ?.createdAt
                  )}
                </div>
              </div>


              <div className="account-info-row">
                <div className="account-info-label">
                  {t(
                    "account.lastLogin"
                  )}
                </div>

                <div className="account-info-value">
                  {formatDate(
                    user
                      ?.lastLoginAt
                  )}
                </div>
              </div>
            </div>


            <div className="account-info-note">
              {t(
                "account.profileEditingComingSoon"
              )}
            </div>
          </section>


          {/* ==================================================
              Security
              ================================================== */}

          <section className="account-card">
            <div className="account-card-header">
              <div>
                <h2>
                  {t(
                    "account.security"
                  )}
                </h2>

                <p>
                  {t(
                    "account.securityDescription"
                  )}
                </p>
              </div>
            </div>


            <form
              className="account-password-form"
              onSubmit={
                handleChangePassword
              }
            >
              <label htmlFor="account-current-password">
                {t(
                  "auth.currentPassword"
                )}
              </label>

              <input
                id="account-current-password"
                type="password"
                autoComplete="current-password"
                value={
                  currentPassword
                }
                disabled={
                  changingPassword
                }
                placeholder={t(
                  "auth.currentPasswordPlaceholder"
                )}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
              />


              <label htmlFor="account-new-password">
                {t(
                  "auth.newPassword"
                )}
              </label>

              <input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                value={
                  newPassword
                }
                disabled={
                  changingPassword
                }
                placeholder={t(
                  "auth.newPasswordPlaceholder"
                )}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
              />


              <div className="account-password-hint">
                {t(
                  "auth.passwordRequirements"
                )}
              </div>


              <label htmlFor="account-confirm-password">
                {t(
                  "auth.confirmPassword"
                )}
              </label>

              <input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                value={
                  confirmPassword
                }
                disabled={
                  changingPassword
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


              {passwordError && (
                <div className="auth-error">
                  {
                    passwordError
                  }
                </div>
              )}


              {passwordSuccess && (
                <div className="auth-success">
                  {
                    passwordSuccess
                  }
                </div>
              )}


              <div className="account-form-actions">
                <button
                  type="submit"
                  className="account-password-submit"
                  disabled={
                    changingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {changingPassword
                    ? t(
                        "auth.changingPassword"
                      )
                    : t(
                        "auth.changePassword"
                      )}
                </button>
              </div>
            </form>
          </section>


          {/* ==================================================
              Session
              ================================================== */}

          <section className="account-card account-session-card">
            <div>
              <h2>
                {t(
                  "account.session"
                )}
              </h2>

              <p>
                {t(
                  "account.sessionDescription"
                )}
              </p>
            </div>


            <button
              type="button"
              className="account-logout-button"
              disabled={
                loggingOut
              }
              onClick={
                handleLogout
              }
            >
              {loggingOut
                ? t(
                    "auth.loggingOut"
                  )
                : t(
                    "auth.logout"
                  )}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}