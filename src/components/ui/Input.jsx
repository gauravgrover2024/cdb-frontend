import React from "react";
import Icon from "../AppIcon";
import { cn } from "../../utils/cn";

const Input = React.forwardRef(
  (
    {
      className,
      type = "text",
      label,
      description,
      error,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random()?.toString(36)?.substr(2, 9)}`;

    // Base input classes
    const baseInputClasses =
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    const hasLeadingIcon = type === "date" || type === "time";
    const leadingIconName = type === "date" ? "Calendar" : "Clock";

    // Checkbox-specific styles
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          id={inputId}
          {...props}
        />
      );
    }

    // Radio button-specific styles
    if (type === "radio") {
      return (
        <input
          type="radio"
          className={cn(
            "h-4 w-4 rounded-full border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          id={inputId}
          {...props}
        />
      );
    }

    // For regular inputs with wrapper structure
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {hasLeadingIcon ? (
          <div className="relative">
            <Icon
              name={leadingIconName}
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type={type}
              className={cn(
                baseInputClasses,
                "pl-10",
                error && "border-destructive focus-visible:ring-destructive",
                className
              )}
              ref={ref}
              id={inputId}
              {...props}
            />
          </div>
        ) : (
          <input
            type={type}
            className={cn(
              baseInputClasses,
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            id={inputId}
            {...props}
          />
        )}

        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;
