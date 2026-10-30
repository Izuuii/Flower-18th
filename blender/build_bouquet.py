"""
Pink tulip bouquet + love letter for the monthsary page.

Run inside Blender (Text Editor > Run Script, or via MCP):

    path = r"D:\Documents_2\flowers\blender\build_bouquet.py"
    exec(compile(open(path).read(), path, "exec"), {})

Everything is rebuilt in the "Bouquet" collection and exported to
public/models/bouquet.glb for the React app. Pass {"EXPORT": False} as the
namespace to rebuild without exporting.

Units are metres, Z up. Node names the app relies on:
  BouquetRoot, Tulip_01..Tulip_18, Letter, EnvelopeBody, EnvelopeFlap, LetterCard
"""
import math
import random

import bpy
from mathutils import Quaternion, Vector

PROJECT = r"D:\Documents_2\flowers"
GLB_PATH = PROJECT + r"\public\models\bouquet.glb"
COLL_NAME = "Bouquet"

Z_TIE = 0.168                       # height of the ribbon tie
STEM_R = 0.0042                     # stem radius
FOCUS = Vector((0.0, 0.0, 0.28))    # tulip heads face away from this point

ENV_W, ENV_H, ENV_T = 0.17, 0.115, 0.006


# ---------------------------------------------------------------- colour helpers

def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_col(h):
    h = h.lstrip("#")
    return tuple(_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def const(c):
    return lambda u, v: c


# ---------------------------------------------------------------- scene helpers

def reset_collection():
    coll = bpy.data.collections.get(COLL_NAME)
    if coll is None:
        coll = bpy.data.collections.new(COLL_NAME)
        bpy.context.scene.collection.children.link(coll)
    for ob in list(coll.all_objects):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)
    # the default startup cube would sit right inside the bouquet
    cube = bpy.data.objects.get("Cube")
    if cube is not None and cube.type == "MESH" and len(cube.data.vertices) == 8:
        bpy.data.objects.remove(cube, do_unlink=True)
    return coll


def empty(name, coll, parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    ob.empty_display_size = 0.05
    coll.objects.link(ob)
    ob.parent = parent
    return ob


def material(name, color=None, roughness=0.5, vcol=False, extra=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except (AttributeError, TypeError):
        pass
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs[0], out.inputs[0])

    def put(key, value):
        sock = bsdf.inputs.get(key)
        if sock is not None:
            sock.default_value = value

    put("Roughness", roughness)
    if color is not None:
        put("Base Color", (*color, 1.0))
        mat.diffuse_color = (*color, 1.0)
    for key, value in (extra or {}).items():
        put(key, value)
    if vcol:
        attr = nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        links.new(attr.outputs[0], bsdf.inputs["Base Color"])
    mat.use_backface_culling = False     # exported as doubleSided
    return mat


class MeshBuilder:
    """Collects verts/faces/per-vertex colours from several parts into one mesh."""

    def __init__(self):
        self.verts, self.faces, self.cols, self.mats = [], [], [], []

    def add(self, verts, faces, cols, mat=0):
        assert len(verts) == len(cols)
        off = len(self.verts)
        self.verts.extend(tuple(v) for v in verts)
        self.cols.extend(cols)
        self.faces.extend(tuple(i + off for i in f) for f in faces)
        self.mats.extend([mat] * len(faces))

    def build(self, name, materials, coll, parent=None, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.verts, [], self.faces)
        attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        attr.data.foreach_set("color", [x for c in self.cols for x in (c[0], c[1], c[2], 1.0)])
        me.color_attributes.active_color = attr
        for m in materials:
            me.materials.append(m)
        me.polygons.foreach_set("material_index", self.mats)
        me.polygons.foreach_set("use_smooth", [smooth] * len(self.faces))
        me.update()
        ob = bpy.data.objects.new(name, me)
        coll.objects.link(ob)
        ob.parent = parent
        return ob


# ---------------------------------------------------------------- geometry primitives

def grid(nu, nv, point, color, wrap_v=False):
    """Quad grid over (u, v) in [0, 1]^2; point/color are f(u, v)."""
    verts, cols, faces = [], [], []
    for i in range(nu):
        u = i / (nu - 1)
        for j in range(nv):
            v = j / nv if wrap_v else j / (nv - 1)
            verts.append(point(u, v))
            cols.append(color(u, v))
    for i in range(nu - 1):
        for j in range(nv if wrap_v else nv - 1):
            j2 = (j + 1) % nv
            faces.append((i * nv + j, i * nv + j2, (i + 1) * nv + j2, (i + 1) * nv + j))
    return verts, faces, cols


def lathe(profile, sides, color):
    verts, cols, faces = [], [], []
    for r, z in profile:
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(Vector((r * math.cos(a), r * math.sin(a), z)))
            cols.append(color)
    for i in range(len(profile) - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((i * sides + k, i * sides + k2, (i + 1) * sides + k2, (i + 1) * sides + k))
    return verts, faces, cols


def tube(points, radius, sides, colors, cap_color):
    """Tube along a polyline (parallel-transport frames), capped at the start."""
    n = len(points)
    tangents = [(points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized() for i in range(n)]
    ref = Vector((1, 0, 0)) if abs(tangents[0].x) < 0.9 else Vector((0, 1, 0))
    normal = tangents[0].cross(ref).normalized()
    verts, cols, faces = [], [], []
    for i, p in enumerate(points):
        if i:
            normal = (tangents[i - 1].rotation_difference(tangents[i]) @ normal).normalized()
        binormal = tangents[i].cross(normal)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(p + (normal * math.cos(a) + binormal * math.sin(a)) * radius)
            cols.append(colors[i])
    for i in range(n - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            faces.append((i * sides + k, i * sides + k2, (i + 1) * sides + k2, (i + 1) * sides + k))
    centre = len(verts)
    verts.append(points[0].copy())
    cols.append(cap_color)
    for k in range(sides):
        faces.append((centre, (k + 1) % sides, k))
    return verts, faces, cols


def bezier(p0, p1, p2, p3, t):
    m = 1 - t
    return p0 * (m * m * m) + p1 * (3 * m * m * t) + p2 * (3 * m * t * t) + p3 * (t * t * t)


def bezier_d(p0, p1, p2, p3, t):
    m = 1 - t
    return (p1 - p0) * (3 * m * m) + (p2 - p1) * (6 * m * t) + (p3 - p2) * (3 * t * t)


# ---------------------------------------------------------------- bouquet parts

def tulip_head(R, H, opening, base, tip, green):
    """Six cupped petals around +Z (3 outer, 3 inner) plus a green receptacle."""
    mb = MeshBuilder()

    def petal(phi, span, rscale, hscale, shade):
        def point(t, s01):
            u = math.sin(t * math.pi / 2)          # rows bunch up towards the tip
            s = 2 * s01 - 1
            if u < 0.55:
                cup = 0.3 + 0.7 * math.sin(math.pi / 2 * u / 0.55) ** 0.6
            else:
                top = 0.55 + 0.9 * opening
                cup = 1 - (1 - top) * ((u - 0.55) / 0.45) ** 2
            if u < 0.62:
                w = 0.45 + 0.55 * math.sin(math.pi / 2 * u / 0.62)
            else:
                w = math.sqrt(max(0.0, 1 - ((u - 0.62) / 0.38) ** 2))
            w = max(w, 0.05)
            r = R * rscale * cup
            # spoon-shaped petal; the -s term shingles overlapping edges
            r *= 1 + 0.07 * (1 - s * s) * math.sin(math.pi * u) - 0.035 * s
            ang = phi + s * span * w
            return Vector((r * math.cos(ang), r * math.sin(ang), H * hscale * u))

        def color(t, s01):
            u = math.sin(t * math.pi / 2)
            s = 2 * s01 - 1
            c = mix(base, tip, u ** 1.4)
            c = mix(c, tip, 0.35 * s * s)
            return tuple(x * shade for x in c)

        mb.add(*grid(16, 13, point, color), mat=0)

    for k in range(3):
        petal(2 * math.pi * k / 3, 1.25, 1.0, 1.0, 1.0)
    for k in range(3):
        petal(2 * math.pi * k / 3 + math.pi / 3, 1.12, 0.86, 0.96, 0.9)
    mb.add(*lathe([(STEM_R, -0.012), (STEM_R * 1.15, -0.006), (R * 0.26, -0.001),
                   (R * 0.33, 0.004), (R * 0.22, 0.008), (0.001, 0.0095)], 12, green), mat=1)
    return mb


def leaf(base, out, length, width, droop, dark, light):
    up = Vector((0, 0, 1))
    p0 = base
    p1 = base + up * (0.45 * length) + out * (0.05 * length)
    p2 = base + up * (0.66 * length) + out * (0.38 * length)
    p3 = base + up * ((0.5 - droop) * length) + out * (0.78 * length)
    side0 = up.cross(out).normalized()

    def point(u, s01):
        s = 2 * s01 - 1
        c = bezier(p0, p1, p2, p3, u)
        t = bezier_d(p0, p1, p2, p3, u).normalized()
        side = (side0 - t * side0.dot(t)).normalized()
        nrm = t.cross(side)
        if u < 0.3:
            w = 0.55 + 0.45 * math.sin(math.pi / 2 * u / 0.3)
        else:
            w = 1 - ((u - 0.3) / 0.7) ** 1.7
        w = max(w, 0.02) * width
        return c + side * (s * w) + nrm * (0.4 * w * s * s)     # channelled leaf

    def color(u, s01):
        s = 2 * s01 - 1
        return mix(mix(dark, light, u), light, 0.3 * s * s)

    return grid(22, 9, point, color)


def paper_sheet(phi, span0, span1, z0, z1, peak, r0, r1, flare, dark, light, shade=1.0):
    """One sheet of wrapping paper: gathered at the tie, flaring to a pointed top."""
    def point(u, s01):
        s = 2 * s01 - 1
        span = span0 + (span1 - span0) * u
        ang = phi + s * span
        r = r0 + (r1 - r0) * u ** 1.8 + flare * u ** 4 + 0.012 * u ** 6 * (1 - abs(s))
        r *= 1 + 0.08 * (1 - u) ** 2 * math.sin(14 * ang)      # gathered pleats at the tie
        r *= 1 + 0.012 * math.sin(6 * ang + 9 * u) * u          # soft crinkle
        r *= 1 - 0.03 * s                                        # shingle neighbours (no z-fighting)
        ztop = z1 + peak * (1 - abs(s)) ** 1.3
        z = z0 + (ztop - z0) * u
        return Vector((r * math.cos(ang), r * math.sin(ang), z))

    def color(u, s01):
        k = shade * (1 - 0.14 * abs(2 * s01 - 1) ** 3)          # darker towards the edges so layers read
        return tuple(x * k for x in mix(dark, light, u ** 0.7))

    return grid(22, 19, point, color)


def sphere(c, r, color, rings=4, sides=6):
    def point(t, u):
        th = math.pi * (0.02 + 0.96 * t)
        ph = 2 * math.pi * u
        return c + Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th))) * r
    return grid(rings + 1, sides, point, const(color), wrap_v=True)


def baby_breath(rng, centre, base, white, stem_col):
    """A thin sprig ending in a loose dome of tiny white florets."""
    lead = (centre - base).normalized()
    pts = [bezier(base, base + Vector((0, 0, 0.08)), centre - lead * 0.04, centre, k / 12)
           for k in range(13)]
    yield tube(pts, 0.0012, 5, [stem_col] * len(pts), stem_col)
    for _ in range(13):
        d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), abs(rng.gauss(0, 1)) * 1.2)).normalized()
        yield sphere(centre + d * 0.014 * rng.uniform(0.4, 1.0), rng.uniform(0.0022, 0.0032), white)


def ribbon(knot, color):
    mb = MeshBuilder()

    def band(s01, u):
        s = 2 * s01 - 1
        a = 2 * math.pi * u
        r = 0.032 * (1 + 0.05 * (1 - s * s))
        return Vector((r * math.cos(a), r * math.sin(a), Z_TIE + 0.011 * s))
    mb.add(*grid(5, 48, band, const(color), wrap_v=True))

    for sgn in (-1, 1):
        def loop(s01, u, sgn=sgn):
            s = 2 * s01 - 1
            t = 2 * math.pi * u
            x = sgn * 0.06 * (1 - math.cos(t)) / 2
            y = -0.003 - 0.016 * math.sin(t)
            h = 0.016 * (0.3 + 0.7 * math.sin(t / 2) ** 2)      # pinched at the knot
            return knot + Vector((x, y, s * h + 0.32 * abs(x)))
        mb.add(*grid(5, 40, loop, const(color), wrap_v=True))

        def tail(t, s01, sgn=sgn):
            s = 2 * s01 - 1
            u = t * (1 - 0.12 * (1 - abs(s)))                    # V-notched end
            cx = sgn * (0.004 + 0.04 * u + 0.008 * math.sin(math.pi * u))
            cy = -0.004 - 0.010 * math.sin(math.pi * u * 0.9)
            cz = -0.135 * u
            ln = math.hypot(0.04, 0.135)
            px, pz = 0.135 / ln, sgn * 0.04 / ln
            twist = 0.6 * math.sin(math.pi * u) * sgn
            w = Vector((px * math.cos(twist), math.sin(twist), pz * math.cos(twist))) * 0.011
            return knot + Vector((cx, cy, cz)) + w * s
        mb.add(*grid(24, 5, tail, const(color)))

    def knot_pt(t, u):
        th = math.pi * (0.03 + 0.94 * t)
        ph = 2 * math.pi * u
        return knot + Vector((0.014 * math.sin(th) * math.cos(ph),
                              0.008 * math.sin(th) * math.sin(ph),
                              0.012 * math.cos(th)))
    mb.add(*grid(10, 16, knot_pt, const(color), wrap_v=True))
    return mb


# ---------------------------------------------------------------- love letter

def heart_outline(n, size):
    """Counter-clockwise (seen from -Y) heart in the XZ plane, centred on 0."""
    pts = []
    for k in range(n):
        t = -2 * math.pi * k / n
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x * size / 32, (z + 2.5) * size / 32))
    return pts


def flat_poly(outline, y, color):
    """Single n-gon in the XZ plane at depth y; outline must be CCW seen from -Y."""
    verts = [Vector((x, y, z)) for x, z in outline]
    return verts, [tuple(range(len(verts)))], [color] * len(verts)


def letter(coll, mats, cols):
    W, H, T = ENV_W, ENV_H, ENV_T
    x, y, z = W / 2, T / 2, H / 2
    root = empty("Letter", coll)

    # envelope body: open-topped box + the folded flaps printed on its face
    body = MeshBuilder()
    v = [Vector(p) for p in ((-x, -y, -z), (x, -y, -z), (x, -y, z), (-x, -y, z),
                             (-x, y, -z), (x, y, -z), (x, y, z), (-x, y, z))]
    body.add(v, [(0, 1, 2, 3), (5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (4, 5, 1, 0)],
             [cols["body"]] * 8)
    body.add(*flat_poly([(-x, -z), (-0.012, 0.004), (-x, z)], -y - 0.0003, cols["side"]))
    body.add(*flat_poly([(x, -z), (x, z), (0.012, 0.004)], -y - 0.0003, cols["side"]))
    body.add(*flat_poly([(-x, -z), (x, -z), (0.0, 0.012)], -y - 0.0006, cols["bottom"]))
    body.build("EnvelopeBody", [mats["envelope"]], coll, parent=root, smooth=False)

    # top flap, hinged along the top edge (object origin = hinge)
    A, B, C = Vector((-x, 0, 0)), Vector((0, 0, -0.6 * H)), Vector((x, 0, 0))
    p1, p2 = A.lerp(B, 0.9), C.lerp(B, 0.9)
    outline = [(A.x, A.z), (p1.x, p1.z)]
    for k in range(1, 6):
        q = p1.lerp(B, k / 6).lerp(B.lerp(p2, k / 6), k / 6)
        outline.append((q.x, q.z))
    outline += [(p2.x, p2.z), (C.x, C.z)]
    flap = MeshBuilder()
    flap.add(*flat_poly(outline, 0.0, cols["flap"]))
    flap.add(*flat_poly(outline, 0.0004, cols["lining"]))
    flap_ob = flap.build("EnvelopeFlap", [mats["envelope"]], coll, parent=root, smooth=False)
    flap_ob.location = (0, -y - 0.0016, z)

    # puffy heart wax seal on the flap tip
    seal = MeshBuilder()
    rim = heart_outline(48, 0.026)
    rings = []
    verts, faces = [], []
    for k, s in enumerate((1.0, 0.8, 0.6, 0.4, 0.2)):
        depth = -0.0035 * math.sqrt(max(0.0, 1 - s * s))
        rings.append(len(verts))
        verts += [Vector((px * s, depth, pz * s)) for px, pz in rim]
    n = len(rim)
    for a, b in zip(rings, rings[1:]):
        for j in range(n):
            j2 = (j + 1) % n
            faces.append((a + j, a + j2, b + j2, b + j))
    centre = len(verts)
    verts.append(Vector((0, -0.0035, 0)))
    for j in range(n):
        faces.append((rings[-1] + j, rings[-1] + (j + 1) % n, centre))
    seal.add(verts, faces, [(1.0, 1.0, 1.0)] * len(verts))     # colour comes from the material
    seal_ob = seal.build("EnvelopeSeal", [mats["seal"]], coll, parent=flap_ob)
    seal_ob.location = (0, -0.0006, -0.6 * H + 0.017)

    # the letter card tucked inside, with a thin pink border
    cw, ch = 0.156 / 2, 0.104 / 2
    card = MeshBuilder()
    card.add(*flat_poly([(-cw, -ch), (cw, -ch), (cw, ch), (-cw, ch)], 0.0, cols["card"]))
    i, lw = 0.007, 0.0012
    for x0, z0, x1, z1 in ((-cw + i, ch - i - lw, cw - i, ch - i), (-cw + i, -ch + i, cw - i, -ch + i + lw),
                           (-cw + i, -ch + i, -cw + i + lw, ch - i), (cw - i - lw, -ch + i, cw - i, ch - i)):
        card.add(*flat_poly([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], -0.0003, cols["trim"]))
    card_ob = card.build("LetterCard", [mats["card"]], coll, parent=root, smooth=False)
    card_ob.location = (0, 0, -0.004)
    return root


# ---------------------------------------------------------------- build + export

def build():
    coll = reset_collection()
    rng = random.Random(18)

    mats = {
        "petal": material("Petal", roughness=0.5, vcol=True,
                          extra={"Sheen Weight": 0.6, "Sheen Roughness": 0.35,
                                 "Sheen Tint": (1.0, 0.9, 0.94, 1.0)}),
        "plant": material("Plant", roughness=0.5, vcol=True),
        "paper": material("Paper", roughness=0.8, vcol=True, extra={"Sheen Weight": 0.25}),
        "ribbon": material("Ribbon", hex_col("#d81b60"), roughness=0.3,
                           extra={"Sheen Weight": 0.7, "Sheen Roughness": 0.3,
                                  "Sheen Tint": (1.0, 0.75, 0.85, 1.0)}),
        "envelope": material("Envelope", roughness=0.85, vcol=True),
        "seal": material("Seal", hex_col("#b5124f"), roughness=0.25,
                         extra={"Coat Weight": 0.6, "Coat Roughness": 0.1}),
        "card": material("Card", roughness=0.9, vcol=True),
    }
    green = hex_col("#5f8f45")
    palette = [
        (hex_col("#c2185b"), hex_col("#ff8fbf")),   # raspberry
        (hex_col("#e91e63"), hex_col("#ffb0cf")),   # hot pink
        (hex_col("#ec5f8f"), hex_col("#ffc8dc")),   # pink
        (hex_col("#f48fb1"), hex_col("#ffe1ec")),   # blush
    ]
    color_idx = [0, 2, 1, 3, 2, 1, 3, 2, 1, 3, 0, 2, 3, 1, 2, 0, 3, 2]

    root = empty("BouquetRoot", coll)

    # 18 tulips: one in the middle, rings of 7 and 10 around it
    spots = [(0.0, 0.0, 0.505)]
    spots += [(0.062 * math.cos(a), 0.062 * math.sin(a), 0.482)
              for a in (2 * math.pi * k / 7 + 0.3 for k in range(7))]
    spots += [(0.122 * math.cos(a), 0.122 * math.sin(a), 0.442)
              for a in (2 * math.pi * k / 10 + 0.05 for k in range(10))]
    heads = []
    for i, spot in enumerate(spots):
        p = Vector(spot) + Vector((rng.uniform(-0.005, 0.005), rng.uniform(-0.005, 0.005),
                                   rng.uniform(-0.01, 0.01)))
        d = (p - FOCUS).normalized()
        base, tip = palette[color_idx[i]]
        head = tulip_head(rng.uniform(0.024, 0.028), rng.uniform(0.062, 0.072),
                          rng.uniform(0.05, 0.4), base, tip, green)
        ob = head.build(f"Tulip_{i + 1:02d}", [mats["petal"], mats["plant"]], coll, parent=root)
        ob.location = p
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = (Vector((0, 0, 1)).rotation_difference(d)
                                  @ Quaternion((0, 0, 1), rng.uniform(0, 2 * math.pi)))
        heads.append((p, d))

    # stems: bundled straight below the tie, curving out to each head above it
    stems = MeshBuilder()
    stem_dark, stem_light, stem_cut = hex_col("#3f6b35"), hex_col("#6a9a4c"), hex_col("#b9d39b")
    for i, (p, d) in enumerate(heads):
        flat = Vector((p.x, p.y, 0))
        o = flat.normalized() * (0.0 if i == 0 else 0.0085 if i < 8 else 0.016)
        bottom = Vector((o.x * 1.35, o.y * 1.35, rng.uniform(0.004, 0.01)))
        tie = Vector((o.x, o.y, Z_TIE))
        top = p - d * 0.006
        h = top.z - tie.z
        q1, q2 = tie + Vector((0, 0, h * 0.45)), top - d * (h * 0.32)
        pts = [bottom.lerp(tie, k / 8) for k in range(8)]
        pts += [bezier(tie, q1, q2, top, k / 25) for k in range(26)]
        colors = [mix(stem_dark, stem_light, k / (len(pts) - 1)) for k in range(len(pts))]
        stems.add(*tube(pts, STEM_R, 8, colors, stem_cut))
    stems.build("Stems", [mats["plant"]], coll, parent=root)

    leaves = MeshBuilder()
    for k in range(6):
        a = 2 * math.pi * k / 6 + math.pi / 6 + rng.uniform(-0.12, 0.12)
        out = Vector((math.cos(a), math.sin(a), 0))
        leaves.add(*leaf(Vector((0, 0, 0.30)) + out * 0.035, out, rng.uniform(0.21, 0.25),
                         rng.uniform(0.018, 0.022), rng.uniform(0.1, 0.2),
                         hex_col("#4c7448"), hex_col("#86ad7c")))
    leaves.build("Leaves", [mats["plant"]], coll, parent=root)

    inner = MeshBuilder()
    for k in range(5):
        inner.add(*paper_sheet(2 * math.pi * k / 5 + 0.35, 0.75, 0.86, Z_TIE - 0.01, 0.385, 0.04,
                               0.0225, 0.125, 0.025, hex_col("#f3d9e1"), hex_col("#fff7f9"),
                               shade=1.0 if k % 2 else 0.96))
    inner.build("PaperInner", [mats["paper"]], coll, parent=root)

    outer = MeshBuilder()
    for k in range(6):
        outer.add(*paper_sheet(2 * math.pi * k / 6, 0.62, 0.75, Z_TIE - 0.01, 0.39, 0.05,
                               0.024, 0.165, 0.03, hex_col("#de6f97"), hex_col("#f6adc6"),
                               shade=1.0 if k % 2 else 0.92))
    outer.build("PaperOuter", [mats["paper"]], coll, parent=root)

    # baby's breath tucked into the gaps of the outer ring
    filler = MeshBuilder()
    for k in range(10):
        a = 2 * math.pi * k / 10 + 0.05 + math.pi / 10
        out = Vector((math.cos(a), math.sin(a), 0))
        centre = out * 0.148 + Vector((0, 0, 0.452 + rng.uniform(-0.008, 0.008)))
        for part in baby_breath(rng, centre, out * 0.03 + Vector((0, 0, 0.3)),
                                hex_col("#fffafc"), hex_col("#7a9a62")):
            filler.add(*part)
    filler.build("Filler", [mats["plant"]], coll, parent=root)

    ribbon(Vector((0, -0.036, Z_TIE)), (1.0, 1.0, 1.0)).build("Ribbon", [mats["ribbon"]], coll, parent=root)

    env = letter(coll, mats, {
        "body": hex_col("#f8bdd0"), "side": hex_col("#f6b0c6"), "bottom": hex_col("#f2a2bd"),
        "flap": hex_col("#f9c3d5"), "lining": hex_col("#e2578d"),
        "card": hex_col("#fffaf3"), "trim": hex_col("#f48fb1"),
    })
    # preview pose in front of the bouquet; the web app places the letter itself
    env.location = (0.11, -0.2, 0.12)
    env.rotation_euler = (math.radians(-12), 0, math.radians(-14))

    total = sum(len(o.data.vertices) for o in coll.all_objects if o.type == "MESH")
    print(f"built {len(coll.all_objects)} objects, {total} vertices")
    return coll


def export(coll):
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    for ob in coll.all_objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH, export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_vertex_color="MATERIAL", export_lights=False,
        export_cameras=False, export_animations=False, export_extras=False)
    print("exported", GLB_PATH)


collection = build()
if globals().get("EXPORT", True):
    export(collection)
