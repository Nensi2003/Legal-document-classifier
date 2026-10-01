import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DynamicField } from "../../features/documents/components/DynamicField";

vi.mock("../../features/documents/components/ObjectField", () => ({
  ObjectField: () => (
    <div data-testid="object-field">
      Object Field
    </div>
  ),
}));

vi.mock("../../features/documents/components/ArrayField", () => ({
  ArrayField: () => (
    <div data-testid="array-field">
      Array Field
    </div>
  ),
}));

describe("DynamicField", () => {
  it("renders a default string field", () => {
    render(
      <DynamicField
        name="firstName"
        schema={{
          type: "string",
        }}
        value="John"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue("John");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("uses the schema title as the field label", () => {
    render(
      <DynamicField
        name="firstName"
        schema={{
          type: "string",
          title: "First Name",
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText("First Name")
    ).toBeInTheDocument();
  });

  it("shows the required indicator", () => {
    render(
      <DynamicField
        name="firstName"
        schema={{
          type: "string",
        }}
        value=""
        onChange={vi.fn()}
        required
      />
    );

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("calls onChange when a string value changes", () => {
    const onChange = vi.fn();

    render(
      <DynamicField
        name="firstName"
        schema={{
          type: "string",
        }}
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole("textbox");

    fireEvent.change(input, {
      target: {
        value: "Alice",
      },
    });

    expect(onChange).toHaveBeenCalledWith("Alice");
  });

  it("renders an email input", () => {
    render(
      <DynamicField
        name="email"
        schema={{
          type: "string",
          format: "email",
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("textbox")
    ).toHaveAttribute("type", "email");
  });

  it("renders a date input for the expected date pattern", () => {
    render(
      <DynamicField
        name="birthDate"
        schema={{
          type: "string",
          pattern: "^\\d{2}/\\d{2}/\\d{4}$",
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute(
      "placeholder",
      "DD/MM/YYYY"
    );
  });

  it("renders a number input and converts the value to a number", () => {
    const onChange = vi.fn();

    render(
      <DynamicField
        name="age"
        schema={{
          type: "number",
        }}
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByRole("spinbutton");

    expect(input).toHaveAttribute("type", "number");

    fireEvent.change(input, {
      target: {
        value: "25.5",
      },
    });

    expect(onChange).toHaveBeenCalledWith(25.5);
  });

  it("returns undefined when a number field is cleared", () => {
    const onChange = vi.fn();

    render(
      <DynamicField
        name="age"
        schema={{
          type: "number",
        }}
        value={25}
        onChange={onChange}
      />
    );

    const input = screen.getByRole("spinbutton");

    fireEvent.change(input, {
      target: {
        value: "",
      },
    });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("renders an integer field with step 1", () => {
    render(
      <DynamicField
        name="age"
        schema={{
          type: "integer",
        }}
        value={10}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByRole("spinbutton");

    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("step", "1");
  });

  it("renders an enum as a select", () => {
    render(
      <DynamicField
        name="status"
        schema={{
          type: "string",
          enum: ["Pending", "Approved", "Rejected"],
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");

    expect(select).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Pending",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Approved",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Rejected",
      })
    ).toBeInTheDocument();
  });

  it("calls onChange when an enum option is selected", () => {
    const onChange = vi.fn();

    render(
      <DynamicField
        name="status"
        schema={{
          type: "string",
          enum: ["Pending", "Approved"],
        }}
        value=""
        onChange={onChange}
      />
    );

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: "Approved",
      },
    });

    expect(onChange).toHaveBeenCalledWith(
      "Approved"
    );
  });

  it("renders a boolean checkbox", () => {
    render(
      <DynamicField
        name="active"
        schema={{
          type: "boolean",
        }}
        value={false}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("checkbox")
    ).toBeInTheDocument();
  });

  it("calls onChange with a boolean when checkbox changes", () => {
    const onChange = vi.fn();

    render(
      <DynamicField
        name="active"
        schema={{
          type: "boolean",
        }}
        value={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole("checkbox")
    );

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("passes object fields to ObjectField", () => {
    render(
      <DynamicField
        name="address"
        schema={{
          type: "object",
          properties: {
            street: {
              type: "string",
            },
          },
        }}
        value={{}}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("object-field")
    ).toBeInTheDocument();
  });

  it("passes array fields to ArrayField", () => {
    render(
      <DynamicField
        name="items"
        schema={{
          type: "array",
          items: {
            type: "string",
          },
        }}
        value={[]}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("array-field")
    ).toBeInTheDocument();
  });

  it("renders the field description", () => {
    render(
      <DynamicField
        name="email"
        schema={{
          type: "string",
          description: "Enter your email address",
        }}
        value=""
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText("Enter your email address")
    ).toBeInTheDocument();
  });
});