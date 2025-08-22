import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// GET - Fetch team data for management (captain/admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { abbreviation } = await params;
    const decodedAbbreviation = decodeURIComponent(abbreviation);

    // Get team with captain info
    const team = await prisma.team.findFirst({
      where: { abbreviation: decodedAbbreviation },
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is team captain or admin
    const isCaptain = team.captain?.user?.id === session.user.id;
    const isAdmin = session.user.isAdmin;

    if (!isCaptain && !isAdmin) {
      return NextResponse.json(
        { error: "Only team captains or admins can manage this team" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        color: team.color,
        logo: team.logo,
        captainId: team.captainId,
      },
    });
  } catch (error) {
    console.error("Error fetching team for management:", error);
    return NextResponse.json(
      { error: "Failed to fetch team data" },
      { status: 500 }
    );
  }
}

// PUT - Update team information (captain/admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ abbreviation: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { abbreviation } = await params;
    const decodedAbbreviation = decodeURIComponent(abbreviation);

    // Get team with captain info
    const team = await prisma.team.findFirst({
      where: { abbreviation: decodedAbbreviation },
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is team captain or admin
    const isCaptain = team.captain?.user?.id === session.user.id;
    const isAdmin = session.user.isAdmin;

    if (!isCaptain && !isAdmin) {
      return NextResponse.json(
        { error: "Only team captains or admins can manage this team" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const newAbbreviation = formData.get("abbreviation") as string;
    const logo = formData.get("logo") as File | null;

    // Validate inputs
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!newAbbreviation || newAbbreviation.trim().length === 0) {
      return NextResponse.json(
        { error: "Team abbreviation is required" },
        { status: 400 }
      );
    }

    if (newAbbreviation.length < 1 || newAbbreviation.length > 4) {
      return NextResponse.json(
        { error: "Team abbreviation must be 1-4 characters" },
        { status: 400 }
      );
    }

    // Check if abbreviation is unique (excluding current team)
    if (newAbbreviation !== decodedAbbreviation) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          abbreviation: newAbbreviation,
          id: { not: team.id },
        },
      });

      if (existingTeam) {
        return NextResponse.json(
          { error: "Team abbreviation already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updates: {
      name?: string;
      abbreviation?: string;
      logo?: string;
    } = {
      name: name.trim(),
      abbreviation: newAbbreviation.trim().toUpperCase(),
    };

    // Handle logo upload
    if (logo) {
      try {
        const bytes = await logo.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");
        const mimeType = logo.type || "image/jpeg";
        updates.logo = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.error("Error processing logo:", error);
        return NextResponse.json(
          { error: "Failed to process logo" },
          { status: 400 }
        );
      }
    }

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: updates,
      include: {
        captain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        abbreviation: updatedTeam.abbreviation,
        color: updatedTeam.color,
        logo: updatedTeam.logo,
        captainId: updatedTeam.captainId,
        captain: updatedTeam.captain,
      },
    });
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}
