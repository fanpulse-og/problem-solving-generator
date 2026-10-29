#!/usr/bin/env python3
"""
Independent cross-check of generated questions.

Re-solves every exported question from its GIVEN values using Python's exact
fractions (and math for π / square roots), sharing no code with the app, and
compares with the answer the app shows. Usage:

    npx vite-node scripts/export-samples.ts 40 > /tmp/samples.jsonl
    python3 scripts/crosscheck.py /tmp/samples.jsonl
"""
import json
import math
import re
import sys
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction as F


def q(x):
    """Rational from the export ({"$q": "n/d"}) or a plain number."""
    if isinstance(x, dict) and "$q" in x:
        n, d = x["$q"].split("/")
        return F(int(n), int(d))
    return F(x)


def nums(text):
    """All numbers in an answer, with \\frac{a}{b} and mixed numbers read as fractions."""
    t = text.replace(" ", "").replace(",", " ")
    out = []
    for m in re.finditer(r"(\d+)?\\frac\{(\d+)\}\{(\d+)\}|(\d+(?:\.\d+)?)", t):
        if m.group(2):
            whole = int(m.group(1) or 0)
            out.append(whole + F(int(m.group(2)), int(m.group(3))))
        else:
            out.append(F(m.group(4)))
    return out


def last_num(text):
    return nums(text)[-1]


def round_dp(x, dp):
    return F(Decimal(str(float(x) if not isinstance(x, F) else x.numerator / x.denominator)).quantize(Decimal(1).scaleb(-dp), rounding=ROUND_HALF_UP)) if not isinstance(x, F) else F(
        (Decimal(x.numerator) / Decimal(x.denominator)).quantize(Decimal(1).scaleb(-dp), rounding=ROUND_HALF_UP)
    )


def round_sf(x, sf):
    mag = math.floor(math.log10(abs(x)))
    return round_dp(x, sf - 1 - mag) if sf - 1 - mag >= 0 else F(round(x / 10 ** (mag - sf + 1)) * 10 ** (mag - sf + 1))


def close(a, b, tol=F(0)):
    return abs(F(a) - F(b)) <= tol


# ---------------------------------------------------------------- per template


def num_ticket_price(v, ans, level):
    total, share = v["total"], q(v["childShare"])
    child = total * share
    adult = total - child
    takings = F(v["takingsP"], 100)
    if level == "stretch":
        diff = F(v["adultP"] - v["childP"], 100)
        expect = (takings + child * diff) / total  # the adult price
    else:
        expect = (takings - adult * F(v["adultP"], 100)) / child
    ok = last_num(ans[-1]) == expect
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == child
    return ok, f"expected £{float(expect):.2f}"


def num_fraction_left(v, ans, level):
    fr = [q(f) for f in v["fracs"]]
    if level == "stretch":
        expect = F(v["left"] + v["fixed"]) / (1 - sum(fr))
        return last_num(ans[0]) == expect, f"expected {expect}"
    start = v["start"]
    left = start - sum(f * start for f in fr) - v["fixed"]
    ok = last_num(ans[-1]) == F(left, start)
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == left
    return ok, f"expected {F(left, start)}"


def num_compare_cartons(v, ans, level):
    jp = F(v["pctP"], 100) * v["volP"]
    if level == "stretch":
        a, b = v["ratioQ"]
        winner = "P" if F(v["pctP"], 100) > F(a, a + b) else "Q"
        pcts = nums(ans[0])
        return ans[0].startswith(f"Carton {winner} ") and pcts == [F(v["pctP"]), F(100 * a, a + b)], f"expected carton {winner}"
    expect = abs(jp - v["juiceQ"])
    ok = nums(ans[-1])[0] == expect
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == jp and nums(ans[1])[0] == v["juiceQ"]
    return ok, f"expected {expect}"


def alg_rule_reverse(v, ans, level):
    rate, fixed = F(v["rate"]), F(v["fixed"])
    x1, x2 = q(v["x1"]), q(v["x2"])
    out = lambda x: rate * x + fixed  # noqa: E731
    if level == "stretch":
        a, b = q(v["known"][0]), q(v["known"][1])
        # Solve the rule from the two given cases, then apply.
        r = (out(b) - out(a)) / (b - a)
        f = out(a) - r * a
        expect = r * x2 + f
        if v["kind"] == "cook":
            n = nums(ans[0])
            got = n[0] * 60 + (n[1] if len(n) > 1 else 0) if "hour" in ans[0] else n[0]
            return got == expect, f"expected {expect} minutes"
        return last_num(ans[0]) == expect, f"expected {expect}"
    ok = nums(ans[0])[0] == out(x1)
    if v["kind"] == "hire" and level == "core":
        expect = math.floor((v["budget"] - fixed) / rate)
    else:
        expect = (out(x2) - fixed) / rate
    return ok and nums(ans[1])[0] == expect, f"expected {out(x1)} and {expect}"


def alg_sequence_explain(v, ans, level):
    s, d = v["start"], v["diff"]
    terms = [s + (n - 1) * d for n in range(1, 400)]
    if v["notTerm"] in terms:
        return False, "notTerm is a term"
    if level == "foundational":
        return nums(ans[0])[0] == terms[5] and nums(ans[2])[0] == terms[v["nth"] - 1] and ans[1] == f"Add {d} to the previous term", "next/nth term"
    if level == "core":
        m = re.search(r"(\d+)n(?: ([+-]) (\d+))?", ans[0])
        c = 0 if not m.group(2) else int(m.group(3)) * (1 if m.group(2) == "+" else -1)
        ok = int(m.group(1)) == d and c == s - d
        if "whole number" in ans[1]:  # the n = ... explanation, when not a parity argument
            ok = ok and nums(ans[1])[-1] == F(v["notTerm"] - (s - d), d) and ans[1].startswith("$" + ans[0].strip("$") + " = " + str(v["notTerm"]) + "$")
        else:  # parity argument: the terms' parity and the number's parity must both be stated correctly
            m2 = re.match(r"All the terms are (odd|even) numbers, but (\d+) is (odd|even)\.", ans[1])
            ok = ok and bool(m2) and d % 2 == 0 and m2.group(1) == ("odd" if s % 2 else "even") and int(m2.group(2)) == v["notTerm"] and m2.group(3) == ("odd" if v["notTerm"] % 2 else "even")
        return ok, "nth term / explanation"
    usable = [t for t in terms if t <= v["sticks"]]
    n, left = len(usable), v["sticks"] - usable[-1]
    got = nums(ans[0])
    return got[0] == n and got[1] == left, f"expected pattern {n}, {left} left"


def alg_equal_cost(v, ans, level):
    if level == "foundational":
        p = v["plan"]
        same = F(p["fee"], p["perB"] - p["perA"])
        return nums(ans[0])[0] == p["fee"] + p["perA"] * p["ask"] and nums(ans[1])[0] == same, "plans"
    pays = v["R"] * (1 - q(v["f"])) if level == "core" else F(v["deposit"] + v["months"] * v["monthly"])
    k = (1 - pays / v["P"]) * 100
    return last_num(ans[0]) == k, f"expected k = {k}"


def ratio_difference(v, ans, level):
    money = v["ctx"]["unitIsMoney"]
    scale = F(1, 100) if money else F(1)
    r1, r2 = v["r1"], v["r2"]
    D = (r1 - r2) * v["unit"] * scale
    part = D / (r1 - r2)
    if level == "foundational":
        f1, f2 = v["fr"]
        a = F(v["fTotal"]) * scale * f1 / (f1 + f2)
        return nums(ans[0])[0] == a and nums(ans[1])[0] == part * r2, "foundational"
    if level == "stretch":
        g = D / 2
        expect = 2 * g / (r1 - r2) * (r1 + r2)
    else:
        expect = {"total": part * (r1 + r2), "smaller": part * r2, "larger": part * r1}[v["ask"]]
    return nums(ans[0])[0] == expect, f"expected {expect}"


def ratio_three_part(v, ans, level):
    r = v["r"]
    if level == "stretch":
        m, n = v["m"], v["n"]
        r = [m, 1, m * n]  # rebuild the ratio from the "times as much" statements
    D = (max(r) - min(r)) * v["unit"]
    part = F(D, max(r) - min(r))
    if level == "foundational":
        fr = v["fr"]
        T = sum(fr) * v["fUnit"]
        return nums(ans[0])[0] == F(T, sum(fr)) * max(fr) and last_num(ans[1]) == part * sum(r), "foundational"
    expect = part * r[1] if (level == "core" and v["ask"] == "middle") else part * sum(r)
    return last_num(ans[0]) == expect, f"expected {expect}"


def ratio_linked(v, ans, level):
    p, qq, r, s = v["p"], v["q"], v["r"], v["s"]
    L = qq * r // math.gcd(qq, r)
    c = [p * L // qq, L, s * L // r]
    g = math.gcd(math.gcd(c[0], c[1]), c[2])
    c = [x // g for x in c]
    if level == "stretch":
        D = abs(c[2] - c[0]) * v["unit"]
        expect = F(D, abs(c[2] - c[0])) * sum(c)
        return last_num(ans[0]) == expect, f"expected {expect}"
    N = sum(c) * v["unit"]
    expect = F(N, sum(c)) * c[0]
    ok = last_num(ans[-1]) == expect
    if level == "foundational":
        ok = ok and ans[0] == " : ".join(map(str, c))
    return ok, f"expected {expect}"


def geom_paint_floor(v, ans, level):
    W, H, T, cover = q(v["W"]), q(v["H"]), q(v["T"]), q(v["cover"])
    area = W * H + T * H / 2
    tins = math.ceil(area * v["coats"] / cover)
    cost = F(tins * v["priceP"], 100)
    if level == "foundational":
        return nums(ans[0])[0] == area and nums(ans[1])[0] == tins, f"area {area}, tins {tins}"
    if level == "stretch":
        yes = cost <= F(v["budgetP"], 100)
        n = nums(ans[0])
        return ans[0].startswith("Yes" if yes else "No") and n[0] == tins and n[1] == cost and n[2] == F(v["budgetP"], 100), f"cost {cost}"
    return nums(ans[0])[0] == cost, f"expected £{float(cost):.2f}"


def geom_isosceles_area(v, ans, level):
    b = float(q(v["base"]))
    if level == "foundational":
        s = float(q(v["side"]))
        h = math.sqrt(s * s - (b / 2) ** 2)
        return close(nums(ans[0])[0], F(h).limit_denominator(1000)) and close(nums(ans[1])[0], F(b * h / 2).limit_denominator(1000)), "found"
    if level == "core":
        P = float(q(v["perimeter"]))
        s = (P - b) / 2
        A = b / 2 * math.sqrt(s * s - (b / 2) ** 2)
        expect = round_sf(A, 3) if v["calc"] == "calc" else F(A).limit_denominator(1000)
        return nums(ans[0])[0] == expect, f"expected {float(expect)}"
    A = float(q(v["area"]))
    h = 2 * A / b
    per = 2 * math.hypot(b / 2, h) + b
    expect = round_sf(per, 3) if v["calc"] == "calc" else F(per).limit_denominator(1000)
    return nums(ans[0])[0] == expect, f"expected {float(expect)}"


def geom_semicircle_shapes(v, ans, level):
    if level == "stretch":
        L, W = v["L"], v["W"]
        area = L * W - math.pi * (W / 2) ** 2
        per = 2 * L + math.pi * W
        return nums(ans[0])[0] == round_sf(area, 3) and nums(ans[1])[0] == round_sf(per, 3), "plate"
    s = v["side"]  # from √(area of square)
    semi = math.pi * (s / 2) ** 2 / 2
    if level == "foundational":
        return nums(ans[0])[0] == s and nums(ans[1])[0] == round_dp(semi, 1), "found"
    return nums(ans[0])[0] == round_dp(s * s + 4 * semi, 1), "total"


def prob_missing_expected(v, ans, level):
    p = [F(x, 100) for x in v["p"]]
    known = [p[i] for i in range(4) if i not in v["missing"]]
    rest = 1 - sum(known)
    if level == "stretch":
        a, _ = v["missing"]
        target = rest * v["mult"] / (v["mult"] + 1)
        assert a == v["ask"]
    elif v["ask"] in v["missing"]:
        target = rest
    else:
        target = p[v["ask"]]
    ok = nums(ans[-1])[0] == target * v["trials"]
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == rest
    if level == "core":
        i, j = v["orPair"]
        ok = ok and nums(ans[0])[0] == p[i] + p[j]
    return ok, f"expected {target * v['trials']}"


def prob_algebra_table(v, ans, level):
    if level == "stretch":
        T = v["T"]
        red = q(v["redFrac"]) * T
        x = red - v["a"]
        yellow = T - red - (x - v["b"]) - v["m"] * x
        return nums(ans[0])[0] == F(yellow) / T, f"expected {F(yellow) / T}"
    N, c = v["N"], v["counts"]
    probs = [F(x, N) for x in c]
    if level == "foundational":
        x = 1 - probs[0] - probs[1] - probs[2]
        return nums(ans[0])[0] == x and nums(ans[1])[0] == x * N, "found"
    x = (1 - probs[0] - probs[1]) / (v["k"] + 1)
    total = c[0] / probs[0]
    return nums(ans[0])[0] == v["k"] * x * total, "core"


def prob_two_way_table(v, ans, level):
    g, shown = v["grid"], v["shown"]
    val = [[g[r][c] if shown[r][c] else None for c in range(4)] for r in range(3)]
    lines = [[(r, 0), (r, 1), (r, 2), (r, 3)] for r in range(3)] + [[(0, c), (1, c), (2, c)] for c in range(4)]
    changed = True
    while changed:
        changed = False
        for ln in lines:
            gaps = [(r, c) for r, c in ln if val[r][c] is None]
            if len(gaps) != 1:
                continue
            (gr, gc), tot = gaps[0], ln[-1]
            parts = [val[r][c] for r, c in ln[:-1] if (r, c) != (gr, gc)]
            val[gr][gc] = sum(parts) if (gr, gc) == tot else val[tot[0]][tot[1]] - sum(parts)
            changed = True
    if any(x is None for row in val for x in row) or val != g:
        return False, "table not reconstructable"
    rows = [[int(n) for n in m] for m in re.findall(r": (\d+), (\d+), (\d+), (\d+)", ans[0].replace("\u00a0", ""))]
    labels = re.findall(r"(?:— |; )([^:;—]+): \d", ans[0])
    if rows != val or labels != v["ctx"]["rows"] + ["Total"]:
        return False, "completed table text"
    r, c = v["askRow"], v["askCol"]
    expect = F(val[r][3], val[2][3]) if level == "foundational" else F(val[r][3] - val[r][c], val[r][3])
    return nums(ans[1])[0] == expect, f"expected {expect}"


def stats_mean_missing(v, ans, level):
    known, mean = v["known"], q(v["mean"])
    if level == "stretch":
        # x + (x + a) + kx + known = 5 × mean
        x = (5 * mean - v["a"] - sum(known)) / (2 + v["k"])
    else:
        x = mean * (len(known) + 1) - sum(known)
    ok = last_num(ans[-1]) == x
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == mean * (len(known) + 1)
    return ok, f"expected x = {x}"


def stats_median_range(v, ans, level):
    vals = v["values"]

    def median(xs):
        s = sorted(xs)
        n = len(s)
        return F(s[n // 2]) if n % 2 else F(s[n // 2 - 1] + s[n // 2], 2)

    if level == "foundational":
        c = min(vals[0], vals[1]) + (max(vals) - min(vals))
        return nums(ans[0])[0] == c and nums(ans[1])[0] == F(sum(vals), 3), "found"
    if level == "core":
        med, R = median(vals), max(vals) - min(vals)
        sols = [(c, d) for d in range(0, 250) for c in range(d + 1, 250) if median([vals[0], vals[1], c, d]) == med and max(vals[0], vals[1], c, d) - min(vals[0], vals[1], c, d) == R]
        return len(sols) == 1 and nums(ans[0])[:2] == [F(sols[0][0]), F(sols[0][1])], f"solutions {sols[:3]}"
    unk = v["unknown"]
    med, R = median(vals), max(vals) - min(vals)
    counts = {x: vals.count(x) for x in vals}
    mode = max(counts, key=counts.get)
    sols = []
    for x in range(0, 41):
        for y in range(0, 41):
            for z in range(0, 41):
                xs = list(vals)
                for i, val in zip(unk, (x, y, z)):
                    xs[i] = val
                if xs != sorted(xs):
                    continue
                cs = {t: xs.count(t) for t in xs}
                best = max(cs.values())
                modes = [t for t in cs if cs[t] == best]
                if max(xs) - min(xs) == R and median(xs) == med and best > 1 and modes == [mode]:
                    sols.append((x, y, z))
    return len(sols) == 1 and tuple(int(n) for n in nums(ans[0])) == sols[0], f"solutions {sols[:3]}"


def stats_combined_mean(v, ans, level):
    n1, n2, m1, m2 = v["n1"], v["n2"], v["m1"], q(v["m2"])
    overall = (n1 * m1 + n2 * m2) / (n1 + n2)
    if level == "stretch":
        back = (overall * (n1 + n2) - n1 * m1) / n2
        return nums(ans[0])[0] == back, f"expected {back}"
    expect = overall if v["exact"] else round_dp(overall, 1)
    ok = nums(ans[-1])[0] == expect
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == n1 * m1
    return ok, f"expected {float(expect)}"


# ---------------------------------------------------------------- batch 2


def money_round(x):
    """Half-up to the nearest penny, as an exact fraction of pounds."""
    return F((Decimal(x.numerator) / Decimal(x.denominator)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def hm(text):
    """'3 hours 35 minutes' / '45 minutes' / '2 hours' -> minutes."""
    h = re.search(r"(\d+) hours?", text)
    m = re.search(r"(\d+) minutes?", text)
    return (int(h.group(1)) if h else 0) * 60 + (int(m.group(1)) if m else 0)


def clock_of(text):
    a, b = re.findall(r"\d+", text)[:2]
    return int(a) * 60 + int(b)


def ratio_reverse_percentage(v, ans, level):
    orig = F(v["originalP"], 100)
    if level == "stretch":
        m = F(100 - v["pct"], 100)
        end = orig * m * m  # what the question shows
        return last_num(ans[0]) == end / (m * m), "two-year reverse"
    m = F(100 + v["pct"] if v["increase"] else 100 - v["pct"], 100)
    shown_after = orig * m
    ok = last_num(ans[-1]) == shown_after / m
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == F(v["forwardP"], 100) * m
    return ok, "reverse percentage"


def ratio_interest_compare(v, ans, level):
    if level == "stretch":
        val, n = F(v["start"]), 0
        while val >= v["target"]:
            val *= F(100 - v["dep"], 100)
            n += 1
        return nums(ans[0])[0] == n, f"expected {n} years"
    P, rG, rH = F(v["P"]), q(v["rG"]), q(v["rH"])
    G2 = P * (1 + rG / 100) ** 2
    if level == "foundational":
        si = P * rH / 100 * v["years"]
        return nums(ans[0])[0] == money_round(si) and nums(ans[1])[0] == money_round(G2), "foundational interest"
    diff = (G2 - P) - P * rH / 100 * 2
    return nums(ans[0])[0] == money_round(diff), f"expected {float(diff):.4f}"


def ratio_percentage_change_area(v, ans, level):
    a, b = v["a"], v["b"]
    total = F(100 + a, 100) * F(100 + b, 100)
    if level == "stretch":
        need = total / F(100 + a, 100)
        pct = (need - 1) * 100
        word = "increase" if pct > 0 else "decrease"
        return nums(ans[0])[0] == abs(pct) and word in ans[0], "reverse"
    pct = (total - 1) * 100
    word = "increase" if pct > 0 else "decrease"
    ok = nums(ans[-1])[0] == abs(pct) and word in ans[-1]
    if level == "foundational":
        ok = ok and nums(ans[0])[:2] == [v["L"] * F(100 + a, 100), v["W"] * F(100 + b, 100)]
    return ok, f"expected {float(pct)}%"


METALS = {"aluminium": 2.7, "zinc": 7.1, "iron": 7.9, "copper": 9.0, "silver": 10.5, "lead": 11.3, "gold": 19.3}


def ratio_density(v, ans, level):
    if level == "foundational":
        l, w, h = v["dims"]
        vol = l * w * h
        mass = q(v["density"]) * vol
        return nums(ans[0])[0] == vol and nums(ans[1])[0] == mass / vol, "cuboid"
    if level == "core":
        d = (v["massA"] + v["massB"]) / (math.pi * v["r"] ** 2 * v["h"] + v["volB"])
        return nums(ans[0])[0] == round_dp(d, 1), f"expected {d:.3f}"
    d = float(q(v["massKg"])) * 1000 / (math.pi * (v["diameter"] / 2) ** 2 * v["h"])
    metal = min(METALS, key=lambda k: abs(METALS[k] - d))
    return ans[0].lower().startswith(metal) and nums(ans[0])[0] == round_sf(d, 3), f"expected {metal} ({d:.3f})"


def ratio_speed_journey(v, ans, level):
    if level == "foundational":
        d1 = F(v["speed"] * v["minutes"], 60)
        speed = d1 / F(v["minutes"], 60)
        d2 = F(v["speed"] * v["minutes2"], 60)
        return nums(ans[0])[0] == speed and hm(ans[1]) == d2 / speed * 60, "foundational journey"
    if level == "core":
        d = F(v["speed"] * v["minutes"], 60)
        arrive = v["start"] + d / v["speed"] * 60 + v["stop"]
        return clock_of(ans[0]) == arrive, f"expected {arrive} minutes after midnight"
    d = F(v["s1"] * v["t1"], 60) + F(v["s2"] * v["t2"], 60)
    avg = d / F(v["t1"] + v["t2"], 60)
    expect = avg if (avg * 10).denominator == 1 else round_dp(avg, 1)
    return nums(ans[0])[0] == expect, f"expected {float(avg)}"


def ratio_best_buy(v, ans, level):
    if level == "stretch":
        per = 4 if v["offerA"] == "buy3get1" else 3
        a = sum(v["each"][0] for i in range(1, v["need"] + 1) if i % per != 0)
        b = F(v["need"] * v["each"][1] * (100 - v["offB"]), 100)
        shop = "A" if a < b else "B"
        n = nums(ans[0])
        return ans[0].startswith(f"Shop {shop},") and n[0] == abs(F(a) - b) / 100 and n[1] == F(a, 100) and n[2] == b / 100, f"expected shop {shop}"
    units = [F(p, s) for s, p in zip(v["sizes"], v["prices"])]
    best = units.index(min(units))
    if level == "foundational":
        return ans[0] == ("The small pack" if best == 0 else "The large pack"), "best pack"
    return nums(ans[0])[0] == v["sizes"][best], "best size"


def num_packs_cost(v, ans, level):
    if level == "stretch":
        (a, pa), (b, pb) = v["packs"]
        best = min(x * pa + y * pb for x in range(v["need"] + 1) for y in range(v["need"] + 1) if x * a + y * b == v["need"])
        n = nums(ans[0])  # £cost (x packs of a and y packs of b)
        x, y = int(n[1]), int(n[3])
        return n[0] == F(best, 100) and n[2] == a and n[4] == b and x * a + y * b == v["need"] and x * pa + y * pb == best, f"expected £{best / 100:.2f}"
    (size, price), = v["packs"]
    packs = -(-v["need"] // size)
    ok = nums(ans[-1])[0] == F(packs * price, 100)
    if level == "foundational":
        ok = ok and nums(ans[0])[0] == packs
    return ok, "pack cost"


def num_as_many_as_possible(v, ans, level):
    if level == "foundational":
        g = v["kg"] * 1000
        n = g // v["grams"]
        return nums(ans[0])[0] == n and nums(ans[1])[0] == g - n * v["grams"], "tins"
    if level == "core":
        n = (v["budgetP"] - v["fixedP"]) // v["eachP"]
        return nums(ans[0])[0] == n, f"expected {n}"
    counts = [int(q(x) * 100 // v["side"]) for x in v["box"]]
    return nums(ans[0])[0] == counts[0] * counts[1] * counts[2], f"expected {counts}"


def num_time_intervals(v, ans, level):
    if level == "foundational":
        return hm(ans[0]) == v["duration"] and clock_of(ans[1]) == v["start2"] + v["duration"], "walk"
    if level == "core":
        known = sum(d for _, d in v["programmes"])
        return nums(ans[0])[0] == v["duration"] - known, "programme"
    return nums(ans[0])[0] == v["duration"] * 60 // v["seconds"] and (v["duration"] * 60) % v["seconds"] == 0, "items"


def geom_parallel_angles(v, ans, level):
    a, b = v["a"], v["b"]
    if level == "stretch":
        # 180 − (3x + c1) + (x + c2) + (x + c3) = 180  →  x = c2 + c3 − c1
        x = v["c2"] + v["c3"] - v["c1"]
        n = nums(ans[0])
        return n[0] == x + v["c3"] and n[1] == x, "stretch angle"
    if level == "foundational":
        return nums(ans[0])[0] == 180 - a and nums(ans[2])[0] == b and ans[1] == "Angles on a straight line add up to 180°" and ans[3] == "Alternate angles are equal", "x and y"
    return nums(ans[0])[0] == a - b, "x"


def geom_regular_polygons(v, ans, level):
    if level == "foundational":
        return nums(ans[0])[0] == F(360, v["n"]) and nums(ans[1])[0] == 180 - F(360, v["n"]), "angles"
    if level == "core":
        interior = 180 - F(360, v["n"])
        sides = F(360, 180 - interior)
        bad = F(360, 180 - v["impossible"])
        n = nums(ans[1])
        return nums(ans[0])[0] == sides and bad.denominator != 1 and n[0] == 180 - v["impossible"] and n[1] == 360 and n[2] == 180 - v["impossible"], "sides"
    i1, i2 = 180 - F(360, v["m1"]), 180 - F(360, v["m2"])
    n = F(360, 180 - (360 - i1 - i2))
    return nums(ans[0])[0] == n, f"expected n = {n}"


def geom_polygon_algebra(v, ans, level):
    S = (v["sides"] - 2) * 180
    k = sum(a[0] for a in v["angles"])
    c = sum(a[1] for a in v["angles"])
    x = F(S - c, k)
    if level == "stretch":
        return nums(ans[0])[0] == max(a[0] * x + a[1] for a in v["angles"]), "largest angle"
    ok = nums(ans[0])[0] == x
    if level == "foundational":
        ok = ok and ans[1] == "Angles in a quadrilateral add up to 360°"
    return ok, f"expected x = {x}"


# ---------------------------------------------------------------- batch 3


def isqrt_exact(x):
    """Square root of a Fraction that is a perfect square, else None."""
    x = F(x)
    n, d = math.isqrt(x.numerator), math.isqrt(x.denominator)
    return F(n, d) if n * n == x.numerator and d * d == x.denominator else None


def sf_close(shown, x, sf=3):
    return float(shown) == float(round_sf(x, sf))


def ratio_proportion(v, ans, level):
    if level == "stretch":
        k, m = q(v["k"]), v["m"]
        y3 = m * isqrt_exact(v["x3"])
        return nums(ans[0])[0] == k / (y3 * y3), "stretch P"
    kind, k = v["kind"], q(v["k"])
    def f(x):
        x = F(x)
        r = isqrt_exact(x)
        return {"x": x, "x2": x * x, "x3": x ** 3, "sqrt": r, "inv": 1 / x, "inv2": 1 / (x * x), "invsqrt": (1 / r) if r else None}[kind]
    y1 = k * f(v["x1"])
    # Recover k from the given pair (x1, y1) independently.
    k2 = y1 / f(v["x1"])
    k_s = str(k2.numerator) if k2.denominator == 1 else None
    tex = {"x": f"{k_s}x", "x2": f"{k_s}x^2", "x3": f"{k_s}x^3", "sqrt": f"{k_s}\\sqrt{{x}}", "inv": f"\\frac{{{k_s}}}{{x}}", "inv2": f"\\frac{{{k_s}}}{{x^2}}", "invsqrt": f"\\frac{{{k_s}}}{{\\sqrt{{x}}}}"}[kind]
    ok = ans[0] == f"$y = {tex}$"
    if level == "foundational":
        return ok and nums(ans[1])[0] == k2 * f(v["x2"]), "found"
    target = k2 * f(v["x2"])
    xs = [x for x in range(1, 201) if f(x) is not None and k2 * f(x) == target]
    return ok and len(xs) == 1 and nums(ans[1])[0] == xs[0], f"x candidates {xs}"


def num_bounds(v, ans, level):
    if level == "foundational":
        val, step = q(v["value"]), F(1, 10 ** v["dp"])
        return [nums(a)[0] for a in ans] == [val - step / 2, val + step / 2, (val + step / 2) * v["count"]], "bounds"
    if level == "core":
        dA, dB = v["d"]
        sA, sB = v["dStep"]
        tA, tB = q(v["t"][0]), q(v["t"][1])
        tsA, tsB = q(v["tStep"][0]), q(v["tStep"][1])
        maxA = (dA + F(sA, 2)) / (tA - tsA / 2)
        minB = (dB - F(sB, 2)) / (tB + tsB / 2)
        n = nums(ans[0])
        return maxA > minB and n[0] == round_dp(maxA, 2) and n[1] == round_dp(minB, 2), "claim"
    vv, u, t = q(v["v"]), q(v["u"]), q(v["tt"])
    h3, h2 = F(5, 1000), F(5, 100)
    vals = [(a - b) / c for a in (vv - h3, vv + h3) for b in (u - h3, u + h3) for c in (t - h2, t + h2)]
    lo, hi = min(vals), max(vals)
    for dp in (3, 2, 1, 0):
        if round_dp(lo, dp) == round_dp(hi, dp):
            n = nums(ans[0])
            label = "to the nearest whole number" if dp == 0 else f"to {dp} decimal place{'' if dp == 1 else 's'}"
            return n[0] == round_dp(lo, dp) and n[1] == round_dp(lo, dp) and ans[0].endswith(label + ")"), f"expected {round_dp(lo, dp)}"
    return False, "no suitable accuracy"


def geom_similarity(v, ans, level):
    if level == "stretch":
        k = (1 - (1 - v["r"] / 100) ** (2 / 3)) * 100
        return nums(ans[0])[0] == round_sf(k, 3), f"k {k}"
    f = F(v["p"], v["q"])
    if level == "foundational":
        return nums(ans[0])[0] == v["sides"][2] * f and nums(ans[1])[0] == v["areaSmall"] * f * f, "found"
    A1, A2 = v["areaUnit"] * v["p"] ** 2, v["areaUnit"] * v["q"] ** 2
    lf = isqrt_exact(F(A1, A2))
    return nums(ans[0])[0] == v["volSmall"] * lf ** 3, "volume"


def geom_right_trig(v, ans, level):
    r = math.radians
    if level == "foundational":
        x = v["hyp"] * math.sin(r(v["angle"]))
        y = math.degrees(math.atan2(v["opp2"], v["adj2"]))
        return nums(ans[0])[0] == round_sf(x, 3) and nums(ans[1])[0] == round_dp(y, 1), "found"
    if level == "core":
        a = math.degrees(math.acos(v["d"] / v["L"]))
        safe = v["rule"][0] < a < v["rule"][1]
        return ans[0].startswith("Yes" if safe else "No") and nums(ans[0]) == [round_dp(a, 1), v["rule"][0], v["rule"][1]], f"angle {a}"
    h = v["dist"] * math.tan(r(v["elev"]))
    beta = math.degrees(math.atan2(h, v["dist"] + v["back"]))
    return nums(ans[0])[0] == round_dp(beta, 1), f"beta {beta}"


def geom_sine_cosine_rule(v, ans, level):
    a, b, C = v["a"], v["b"], math.radians(v["angle"])
    area = 0.5 * a * b * math.sin(C)
    ac = math.sqrt(a * a + b * b - 2 * a * b * math.cos(C))
    if level == "foundational":
        return nums(ans[0])[0] == round_sf(area, 3) and nums(ans[1])[0] == round_sf(ac, 3), "found"
    if level == "core":
        return nums(ans[0])[0] == round_sf(2 * area, 3), "kite"
    B = math.asin(2 * v["area"] / (a * b))  # acute
    ac2 = math.sqrt(a * a + b * b - 2 * a * b * math.cos(B))
    return nums(ans[0])[0] == round_sf(a + b + ac2, 3), "perimeter"


def geom_pythagoras_3d(v, ans, level):
    l, w, h = v["l"], v["w"], v["h"]
    if level == "foundational":
        return nums(ans[0])[0] == round_sf(math.hypot(l, w), 3) and nums(ans[1])[0] == round_sf(math.sqrt(l * l + w * w + h * h), 3), "diagonals"
    run = math.hypot(l, w) if level == "core" else math.hypot(l, w / 2)
    return nums(ans[0])[0] == round_dp(math.degrees(math.atan2(h, run)), 1), "angle"


def geom_circle_theorems(v, ans, level):
    x = v["x"]
    if level == "foundational":
        return nums(ans[0])[0] == 90 and nums(ans[2])[0] == 180 - 90 - x and ans[1] == "The angle in a semicircle is 90°", "semicircle"
    if level == "core":
        pqr = 90 + x
        return nums(ans[0])[0] == 180 - 90 - (180 - pqr), "RPS"
    return nums(ans[0])[0] == 180 - x, "ADB"


def parse_vec(tex):
    """Coefficients of a and b in a KaTeX vector expression."""
    out = {"a": F(0), "b": F(0)}
    for m in re.finditer(r"([+-])?\s*(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))?\\mathbf\{([ab])\}", tex):
        sign = -1 if m.group(1) == "-" else 1
        coef = F(int(m.group(2)), int(m.group(3))) if m.group(2) else F(int(m.group(4))) if m.group(4) else F(1)
        out[m.group(5)] += sign * coef
    return out


def geom_vectors(v, ans, level):
    if level == "foundational":
        ac = [v["BC"][0] - v["BA"][0], v["BC"][1] - v["BA"][1]]
        c = [v["ka"] * v["a"][0] - v["kb"] * v["b"][0], v["ka"] * v["a"][1] - v["kb"] * v["b"][1]]
        cols = [list(map(int, re.findall(r"-?\d+", a))) for a in ans]
        return cols[0] == ac and cols[1] == c, "columns"
    mu = F(v["om"][0], sum(v["om"]))
    t = F(v["an"][0], sum(v["an"]))
    N = (1 - t, t)
    MN = (N[0], N[1] - mu)
    if level == "core":
        on = parse_vec(ans[0].split("=")[1])
        mn = parse_vec(ans[1].split("=")[1])
        return (on["a"], on["b"]) == N and (mn["a"], mn["b"]) == MN, "ON / MN"
    k = F(sum(v["oe"]), v["oe"][0])
    ME = (k, -mu)
    collinear = MN[0] * ME[1] == MN[1] * ME[0]
    parts_ = ans[0].split("$")
    mn = parse_vec(parts_[1].split("=")[1])
    me = parse_vec(parts_[3].split("=")[1])
    mult = nums(parts_[3].split("=")[-1])[0]
    return collinear and (mn["a"], mn["b"]) == MN and (me["a"], me["b"]) == ME and mult == ME[0] / MN[0], "collinear"


def alg_simultaneous_context(v, ans, level):
    x, y = v["x"], v["y"]
    if level == "stretch":
        N, T = v["n1"] + v["n2"], v["n1"] * x + v["n2"] * y
        c = F(T - x * N, y - x)
        return nums(ans[0])[0] == c, f"c = {c}"
    (a1, b1), (a2, b2) = v["e1"], v["e2"]
    t1, t2 = a1 * x + b1 * y, a2 * x + b2 * y
    det = a1 * b2 - a2 * b1
    xs, ys = F(t1 * b2 - t2 * b1, det), F(a1 * t2 - a2 * t1, det)
    got = [n for a in ans for n in nums(a)]
    return got == [xs / 100, ys / 100], "prices"


def stats_grouped_mean(v, ans, level):
    w, st, fr = v["width"], v["start"], v["freqs"]
    mids = [F(2 * st + (2 * i + 1) * w, 2) for i in range(len(fr))]
    if level == "core":
        # The mean shown in the question, then solve for f linearly.
        mean = sum(m * f for m, f in zip(mids, fr)) / sum(fr)
        i = v["missing"]
        others = sum(m * f for j, (m, f) in enumerate(zip(mids, fr)) if j != i)
        fo = sum(f for j, f in enumerate(fr) if j != i)
        fval = (mean * fo - others) / (mids[i] - mean)
        return nums(ans[0])[0] == fval, f"f = {fval}"
    mean = sum(m * f for m, f in zip(mids, fr)) / sum(fr)
    expect = mean if (mean * 10).denominator == 1 else round_dp(mean, 1)
    k = 1 if level == "foundational" else 0
    ok = nums(ans[k])[0] == expect
    if level == "foundational":
        modal = fr.index(max(fr))
        ok = ok and nums(ans[0])[:2] == [st + modal * w, st + (modal + 1) * w]
    if level == "stretch":
        cut = (v["claimFrom"] - st) // w
        above = sum(fr[cut:])
        pct = F(above * 100, sum(fr))
        shown_pct = pct if (pct * 10).denominator == 1 else round_dp(pct, 1)
        ok = ok and ans[1].startswith("Yes" if pct > v["claimPct"] else "No") and nums(ans[1]) == [above, sum(fr), shown_pct, v["claimPct"]]
    return ok, f"mean {float(mean)}"


def stats_histogram(v, ans, level):
    b, k, s = v["bounds"], v["k"], q(v["s"])
    fd = [s * x for x in k]
    freqs = [fd[i] * (b[i + 1] - b[i]) for i in range(len(k))]
    if level == "foundational":
        return nums(ans[0])[0] == freqs[v["ask"]] and nums(ans[1])[0] == sum(freqs), "frequencies"
    if level == "stretch":
        p_, q_ = v["pair"]
        units = [k[i] * (b[i + 1] - b[i]) for i in range(len(k))]
        scale = (freqs[p_] - freqs[q_]) / (units[p_] - units[q_])  # what the question lets you deduce
        if scale != s:
            return False, "scale not recoverable"
    X = v["X"]
    est = sum(fd[i] * (b[i + 1] - max(b[i], X)) for i in range(len(k)) if b[i + 1] > X)
    return nums(ans[0])[0] == est, f"estimate {est}"


def stats_iqr_compare(v, ans, level):
    def st(xs):
        s = sorted(xs)
        n = len(s)
        return s[(n + 1) // 2 - 1], s[(n + 1) // 4 - 1], s[3 * (n + 1) // 4 - 1]
    med, lq, uq = st(v["listA"])
    if level == "foundational":
        return nums(ans[0])[0] == med and nums(ans[1])[0] == uq - lq, "median/IQR"
    if level == "core":
        iqr = uq - lq
        return (nums(ans[0])[0] == iqr and ans[1].startswith(v["a"] if med > v["medB"] else v["b"]) and ans[2].startswith(v["a"] if iqr < v["iqrB"] else v["b"])
                and nums(ans[1]) == [med, v["medB"]] and nums(ans[2]) == [iqr, v["iqrB"]]), "comparison"
    mB, lB, uB = st(v["listB"])
    n = nums(ans[0])
    better_avg = v["a"] if med > mB else v["b"]
    better_con = v["a"] if uq - lq < uB - lB else v["b"]
    return n[:4] == [med, mB, uq - lq, uB - lB] and f": {better_avg} " in ans[0] and f": {better_con} was" in ans[0], "stretch comparison"


CHECKS = {
    "num-ticket-price": num_ticket_price,
    "num-fraction-left": num_fraction_left,
    "num-compare-cartons": num_compare_cartons,
    "alg-rule-reverse": alg_rule_reverse,
    "alg-sequence-explain": alg_sequence_explain,
    "alg-equal-cost": alg_equal_cost,
    "ratio-difference": ratio_difference,
    "ratio-three-part": ratio_three_part,
    "ratio-linked": ratio_linked,
    "geom-paint-floor": geom_paint_floor,
    "geom-isosceles-area": geom_isosceles_area,
    "geom-semicircle-shapes": geom_semicircle_shapes,
    "prob-missing-expected": prob_missing_expected,
    "prob-algebra-table": prob_algebra_table,
    "prob-two-way-table": prob_two_way_table,
    "stats-mean-missing": stats_mean_missing,
    "stats-median-range": stats_median_range,
    "stats-combined-mean": stats_combined_mean,
    "ratio-reverse-percentage": ratio_reverse_percentage,
    "ratio-interest-compare": ratio_interest_compare,
    "ratio-percentage-change-area": ratio_percentage_change_area,
    "ratio-density": ratio_density,
    "ratio-speed-journey": ratio_speed_journey,
    "ratio-best-buy": ratio_best_buy,
    "num-packs-cost": num_packs_cost,
    "num-as-many-as-possible": num_as_many_as_possible,
    "num-time-intervals": num_time_intervals,
    "geom-parallel-angles": geom_parallel_angles,
    "geom-regular-polygons": geom_regular_polygons,
    "geom-polygon-algebra": geom_polygon_algebra,
    "ratio-proportion": ratio_proportion,
    "num-bounds": num_bounds,
    "geom-similarity": geom_similarity,
    "geom-right-trig": geom_right_trig,
    "geom-sine-cosine-rule": geom_sine_cosine_rule,
    "geom-pythagoras-3d": geom_pythagoras_3d,
    "geom-circle-theorems": geom_circle_theorems,
    "geom-vectors": geom_vectors,
    "alg-simultaneous-context": alg_simultaneous_context,
    "stats-grouped-mean": stats_grouped_mean,
    "stats-histogram": stats_histogram,
    "stats-iqr-compare": stats_iqr_compare,
}


def main(path):
    total, failed, unknown = 0, 0, set()
    per = {}
    with open(path) as f:
        for line in f:
            rec = json.loads(line)
            fn = CHECKS.get(rec["id"])
            if not fn:
                unknown.add(rec["id"])
                continue
            total += 1
            per[rec["id"]] = per.get(rec["id"], 0) + 1
            try:
                ok, why = fn(rec["vars"], rec["answers"], rec["level"])
            except Exception as e:  # a crash is a failure too
                ok, why = False, f"error: {e!r}"
            if not ok:
                failed += 1
                if failed <= 25:
                    print(f"FAIL {rec['code']}: {why}\n     answers: {rec['answers']}")
    for k in sorted(per):
        print(f"  {k:28s} {per[k]:5d} checked")
    if unknown:
        print("No Python check for:", ", ".join(sorted(unknown)))
    print(f"\n{total - failed}/{total} questions agree with the independent Python solution.")
    sys.exit(1 if failed or unknown else 0)


if __name__ == "__main__":
    main(sys.argv[1])
