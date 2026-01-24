import React, { useState } from "react";
import Icon from "../AppIcon";
import Button from "./Button";

const QuickActionToolbar = ({ onAction }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const actions = [
    {
      id: "new-case",
      label: "New Case",
      icon: "Plus",
      variant: "default",
      onClick: () => handleAction("new-case"),
    },
  ];

  const handleAction = (actionId) => {
    if (onAction) {
      onAction(actionId);
    }
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="quick-action-toolbar">
      <div className="hidden md:flex items-center gap-2">
        {actions?.map((action) => (
          <Button
            key={action?.id}
            variant={action?.variant}
            iconName={action?.icon}
            iconPosition="left"
            size="sm"
            onClick={action?.onClick}
          >
            {action?.label}
          </Button>
        ))}
      </div>
      <div className="md:hidden relative">
        <Button
          variant="default"
          iconName="MoreVertical"
          size="sm"
          onClick={toggleDropdown}
        >
          Actions
        </Button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="quick-action-dropdown">
              {actions?.map((action) => (
                <button
                  key={action?.id}
                  onClick={action?.onClick}
                  className="quick-action-dropdown-item"
                >
                  <Icon name={action?.icon} size={18} />
                  <span>{action?.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickActionToolbar;
