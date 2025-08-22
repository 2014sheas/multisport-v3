import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user with their linked player
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        player: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.player) {
      return NextResponse.json(
        { error: "No player account linked to this user" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const experience = formData.get("experience");
    const wins = formData.get("wins");
    const profilePicture = formData.get("profilePicture") as File | null;

    // Prepare updates object
    const updates: { experience?: number | null; wins?: number | null } = {};

    // Handle experience update
    if (experience !== null) {
      const experienceValue =
        experience === "" ? null : parseInt(experience as string);
      if (
        experienceValue === null ||
        (experienceValue >= 0 && experienceValue <= 50)
      ) {
        updates.experience = experienceValue;
      } else {
        return NextResponse.json(
          { error: "Experience must be between 0 and 50 years" },
          { status: 400 }
        );
      }
    }

    // Handle wins update
    if (wins !== null) {
      const winsValue = wins === "" ? null : parseInt(wins as string);
      if (winsValue === null || (winsValue >= 0 && winsValue <= 50)) {
        updates.wins = winsValue;
      } else {
        return NextResponse.json(
          { error: "Years won must be between 0 and 50" },
          { status: 400 }
        );
      }
    }

    // Handle profile picture update
    if (profilePicture) {
      // For now, we'll store the image as a base64 string
      // In a production environment, you'd want to upload to a cloud storage service
      const arrayBuffer = await profilePicture.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = profilePicture.type;
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Update the user's image field
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: dataUrl },
      });
    }

    // Update player experience if provided
    if (Object.keys(updates).length > 0) {
      await prisma.player.update({
        where: { id: user.player.id },
        data: updates,
      });
    }

    // Fetch updated player data
    const updatedPlayer = await prisma.player.findUnique({
      where: { id: user.player.id },
      select: {
        id: true,
        name: true,
        experience: true,
        wins: true,
        eloRating: true,
        gamesPlayed: true,
      },
    });

    // Fetch updated user data to get the new image
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        image: true,
      },
    });

    // Combine player and user data
    const result = {
      ...updatedPlayer,
      profilePicture: updatedUser?.image,
    };

    return NextResponse.json({ player: result });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
