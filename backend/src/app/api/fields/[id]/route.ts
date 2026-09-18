import {
  getFieldById,
  updateField,
  deleteField,
} from "@/services/fieldService";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const fieldId = Number(id);

    if (!Number.isInteger(fieldId)) {
      return NextResponse.json(
        { error: "Invalid field ID" },
        { status: 400 }
      );
    }

    const existingField = await getFieldById(fieldId);

    if (!existingField) {
      return NextResponse.json(
        { error: "Field not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updatedField = await updateField(fieldId, {
      name: body.name,
      type: body.type,
      required: body.required,
      validationRule: body.validationRule,
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    console.error("Error updating field:", error);

    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const fieldId = Number(id);

    if (!Number.isInteger(fieldId)) {
      return NextResponse.json(
        { error: "Invalid field ID" },
        { status: 400 }
      );
    }

    const existingField = await getFieldById(fieldId);

    if (!existingField) {
      return NextResponse.json(
        { error: "Field not found" },
        { status: 404 }
      );
    }

    await deleteField(fieldId);

    return NextResponse.json({
      message: "Field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting field:", error);

    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    );
  }
}