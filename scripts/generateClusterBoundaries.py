#!/usr/bin/env python3
"""
Generate cluster boundaries for UMAP visualization.
Uses HDBSCAN for clustering and alpha shapes for boundary computation.

Requirements:
    pip install numpy hdbscan alphashape shapely

Usage:
    python scripts/generateClusterBoundaries.py
"""

import json
import os
from pathlib import Path

import numpy as np

try:
    import hdbscan
    import alphashape
    from shapely.geometry import Polygon, MultiPolygon
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install numpy hdbscan alphashape shapely")
    exit(1)


# Configuration
INPUT_FILE = "public/umap-cache/gemma_res_12_16k.json"
OUTPUT_FILE = "public/umap-cache/gemma_res_12_16k_clusters.json"

# HDBSCAN parameters - tuned for many small clusters
MIN_CLUSTER_SIZE = 5      # Minimum points to form a cluster (smaller = more clusters)
MIN_SAMPLES = 2            # Core point threshold (smaller = less conservative)
CLUSTER_SELECTION_EPSILON = 0.0  # 0 = no merging of clusters

# Alpha shape parameter (smaller = tighter fit, larger = smoother)
ALPHA = 0.1  # Tighter fit for smaller clusters

# Color palette for clusters (will cycle if more clusters than colors)
COLORS = [
    "#3b82f6",  # blue
    "#10b981",  # emerald
    "#f59e0b",  # amber
    "#ef4444",  # red
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#06b6d4",  # cyan
    "#84cc16",  # lime
    "#f97316",  # orange
    "#6366f1",  # indigo
]


def load_umap_data(filepath: str) -> list[dict]:
    """Load UMAP points from JSON file."""
    with open(filepath, "r") as f:
        return json.load(f)


def cluster_points(points: np.ndarray) -> np.ndarray:
    """Cluster points using HDBSCAN."""
    print(f"Clustering {len(points)} points with HDBSCAN...")
    print(f"  min_cluster_size={MIN_CLUSTER_SIZE}, min_samples={MIN_SAMPLES}")

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=MIN_CLUSTER_SIZE,
        min_samples=MIN_SAMPLES,
        cluster_selection_epsilon=CLUSTER_SELECTION_EPSILON,
        cluster_selection_method='leaf',  # More granular clusters
    )
    labels = clusterer.fit_predict(points)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = np.sum(labels == -1)
    print(f"  Found {n_clusters} clusters, {n_noise} noise points")

    return labels


def compute_alpha_shape(points: np.ndarray, alpha: float | None = None) -> list[list[float]] | None:
    """Compute alpha shape boundary for a set of points."""
    if len(points) < 3:
        return None

    try:
        if alpha is None:
            # Auto-optimize alpha (slower but better fit)
            shape = alphashape.alphashape(points, 0)  # 0 = optimize
        else:
            shape = alphashape.alphashape(points, alpha)

        if shape is None or shape.is_empty:
            return None

        # Handle MultiPolygon (take largest)
        if isinstance(shape, MultiPolygon):
            shape = max(shape.geoms, key=lambda p: p.area)

        if not isinstance(shape, Polygon):
            return None

        # Simplify to reduce point count (tolerance in coordinate units)
        shape = shape.simplify(0.05, preserve_topology=True)

        # Extract exterior coordinates
        coords = list(shape.exterior.coords)
        return [[round(x, 3), round(y, 3)] for x, y in coords]

    except Exception as e:
        print(f"    Alpha shape error: {e}")
        return None


def generate_cluster_boundaries(umap_data: list[dict]) -> list[dict]:
    """Generate cluster boundaries from UMAP data."""

    # Extract coordinates
    points = np.array([[p["x"], p["y"]] for p in umap_data])

    # Cluster
    labels = cluster_points(points)

    # Get unique cluster IDs (exclude -1 which is noise in HDBSCAN)
    cluster_ids = sorted([c for c in set(labels) if c >= 0])

    print(f"\nComputing alpha shapes for {len(cluster_ids)} clusters...")

    boundaries = []
    for i, cluster_id in enumerate(cluster_ids):
        mask = labels == cluster_id
        cluster_pts = points[mask]

        print(f"  Cluster {cluster_id}: {len(cluster_pts)} points...", end=" ")

        polygon = compute_alpha_shape(cluster_pts, ALPHA)

        if polygon and len(polygon) >= 3:
            color = COLORS[i % len(COLORS)]
            boundaries.append({
                "clusterId": int(cluster_id),
                "color": color,
                "pointCount": int(mask.sum()),
                "polygon": polygon,
            })
            print(f"OK ({len(polygon)} vertices)")
        else:
            print("SKIPPED (no valid polygon)")

    return boundaries


def main():
    script_dir = Path(__file__).parent.parent
    input_path = script_dir / INPUT_FILE
    output_path = script_dir / OUTPUT_FILE

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        print("Run the UMAP caching script first:")
        print("  npx tsx scripts/cacheUmapData.ts")
        exit(1)

    # Load data
    print(f"Loading UMAP data from {input_path}...")
    umap_data = load_umap_data(input_path)
    print(f"  Loaded {len(umap_data)} points")

    if len(umap_data) == 0:
        print("Error: No UMAP data found")
        exit(1)

    # Generate boundaries
    boundaries = generate_cluster_boundaries(umap_data)

    # Save output
    print(f"\nSaving {len(boundaries)} cluster boundaries to {output_path}...")
    with open(output_path, "w") as f:
        json.dump(boundaries, f)

    # Print summary
    total_vertices = sum(len(b["polygon"]) for b in boundaries)
    file_size = output_path.stat().st_size / 1024
    print(f"\nDone!")
    print(f"  Clusters: {len(boundaries)}")
    print(f"  Total vertices: {total_vertices}")
    print(f"  File size: {file_size:.1f} KB")


if __name__ == "__main__":
    main()
