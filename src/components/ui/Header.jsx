import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../AppIcon";
import Button from "./Button";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/dsa-operations-dashboard",
      icon: "LayoutDashboard",
    },
    {
      label: "Customer Management",
      path: "/customer-profile-management",
      icon: "Users",
    },
    {
      label: "Loan Processing",
      path: "/pre-file-loan-structuring",
      icon: "FileText",
      submenu: [
        {
          label: "Pre-File Structuring",
          path: "/pre-file-loan-structuring",
        },
        {
          label: "Multi-Bank Approval",
          path: "/multi-bank-loan-approval-tracking",
        },
      ],
    },
    {
      label: "Loan Execution",
      path: "/post-file-disbursement-management",
      icon: "CreditCard",
    },
  ];

  const moreItems = [
    {
      label: "Delivery Operations",
      path: "/vehicle-delivery-insurance-processing",
      icon: "Truck",
    },
  ];

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isActive = (path) => {
    return location?.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleMoreMenu = () => {
    setMoreMenuOpen(!moreMenuOpen);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="header-logo">
            <div className="header-logo-icon">
              <Icon name="Building2" size={24} color="#FFFFFF" />
            </div>
            <span className="header-logo-text">DSA Lifecycle Manager</span>
          </div>

          <nav className="header-nav hidden lg:flex">
            {navigationItems?.map((item) => (
              <div key={item?.path} className="relative">
                <button
                  onClick={() => handleNavigation(item?.path)}
                  className={`header-nav-item ${
                    isActive(item?.path) ? "active" : ""
                  }`}
                >
                  <Icon name={item?.icon} size={16} />
                  <span>{item?.label}</span>
                </button>
              </div>
            ))}

            <div className="relative">
              <button onClick={toggleMoreMenu} className="header-nav-item">
                <Icon name="MoreHorizontal" size={16} />
                <span>More</span>
              </button>

              {moreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card rounded-lg shadow-elevation-3 border border-border z-50">
                    {moreItems?.map((item) => (
                      <button
                        key={item?.path}
                        onClick={() => handleNavigation(item?.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-250 first:rounded-t-lg last:rounded-b-lg ${
                          isActive(item?.path)
                            ? "bg-primary/10 text-primary"
                            : ""
                        }`}
                      >
                        <Icon name={item?.icon} size={16} />
                        <span>{item?.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          <div className="header-actions hidden lg:flex">
            <Button
              variant="ghost"
              iconName="Bell"
              iconPosition="left"
              size="sm"
            >
              Notifications
            </Button>
            <Button
              variant="outline"
              iconName="User"
              iconPosition="left"
              size="sm"
            >
              Profile
            </Button>
          </div>

          <button onClick={toggleMobileMenu} className="mobile-menu-button">
            <Icon name={mobileMenuOpen ? "X" : "Menu"} size={24} />
          </button>
        </div>
      </header>
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <div className="flex items-center gap-3">
                <div className="header-logo-icon">
                  <Icon name="Building2" size={20} color="#FFFFFF" />
                </div>
                <span className="text-base font-semibold text-foreground">
                  DSA Manager
                </span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <Icon name="X" size={24} />
              </button>
            </div>

            <nav className="mobile-menu-nav">
              {navigationItems?.map((item) => (
                <button
                  key={item?.path}
                  onClick={() => handleNavigation(item?.path)}
                  className={`mobile-menu-item ${
                    isActive(item?.path) ? "active" : ""
                  }`}
                >
                  <Icon name={item?.icon} size={20} />
                  <span>{item?.label}</span>
                </button>
              ))}

              {moreItems?.map((item) => (
                <button
                  key={item?.path}
                  onClick={() => handleNavigation(item?.path)}
                  className={`mobile-menu-item ${
                    isActive(item?.path) ? "active" : ""
                  }`}
                >
                  <Icon name={item?.icon} size={20} />
                  <span>{item?.label}</span>
                </button>
              ))}

              <div className="border-t border-border my-4" />

              <button
                onClick={() => handleNavigation("/notifications")}
                className="mobile-menu-item"
              >
                <Icon name="Bell" size={20} />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => handleNavigation("/profile")}
                className="mobile-menu-item"
              >
                <Icon name="User" size={20} />
                <span>Profile</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
