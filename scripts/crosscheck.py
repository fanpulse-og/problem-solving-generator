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
        # Higher: area of DEF (area factor f²); KS3 and Foundation: perimeter of DEF.
        second = v["areaSmall"] * f * f if v.get("tier") == "H" else sum(v["sides"]) * f
        return nums(ans[0])[0] == v["sides"][2] * f and nums(ans[1])[0] == second, "found"
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



# ---------------------------------------------------------------- batch 4


def signed_nums(text):
    """Numbers with their signs, \\frac{a}{b} read as fractions (for coordinates and equations)."""
    t = text.replace("−", "-").replace(" ", "")
    out = []
    for m in re.finditer(r"(-?)\\frac\{(\d+)\}\{(\d+)\}|(-?\d+(?:\.\d+)?)", t):
        if m.group(2):
            out.append((-1 if m.group(1) else 1) * F(int(m.group(2)), int(m.group(3))))
        else:
            out.append(F(m.group(4)))
    return out


def frac_of(text):
    m = re.search(r"\\frac\{(\d+)\}\{(\d+)\}", text)
    return F(int(m.group(1)), int(m.group(2))) if m else F(nums(text)[0])


def std_value(text):
    m = re.search(r"([\d.]+) \\times 10\^\{(-?\d+)\}", text)
    return F(m.group(1)) * F(10) ** int(m.group(2)), F(m.group(1))


def num_lcm_problems(v, ans, level):
    L = math.lcm(*v["sizes"])
    if level == "foundational":
        if v["ctx"] == 0:
            t = v["start"] + L
            want = f"{t // 60 % 24:02d} {t % 60:02d}"
        else:
            want = f"{L} seconds"
        return ans[0] == want, f"expected {want}"
    if level == "core":
        got = nums(ans[0])
        return got == [L // v["sizes"][0], L // v["sizes"][1]], f"expected {L // v['sizes'][0]}, {L // v['sizes'][1]}"
    pence = sum(L // n * pr for n, pr in zip(v["sizes"], v["pricesP"]))
    return last_num(ans[0]) == F(pence, 100), f"expected £{pence / 100:.2f}"


def num_standard_form(v, ans, level):
    A = q(v["a"]) * F(10) ** v["p"]
    B = q(v["b"]) * F(10) ** v["q"]
    vals = [std_value(a) for a in ans if "times" in a]
    if any(not (1 <= m < 10) for _, m in vals):
        return False, "mantissa out of range"
    if level == "foundational":
        return vals[0][0] == A * B and vals[1][0] == A + B, f"expected {A * B}, {A + B}"
    if level == "core":
        want = A / B if v["ctx"] == 2 else A * B
        return vals[0][0] == want, f"expected {float(want):.4g}"
    if v["ctx"] == 0:
        photos = (q(v["a"]) * 10**12) // (q(v["b"]) * 10**6)
        yes = photos > v["claim"]
        got = [int(x) for x in re.findall(r"\d+", ans[0].replace("\u00a0", ""))]
        return ans[0].startswith("Yes" if yes else "No") and got == [photos, v["claim"]], f"photos {photos}"
    grains = q(v["a"]) * 1000 / B
    if v["calc"]:
        mag = math.floor(math.log10(grains))
        mant = round_dp(grains / F(10) ** mag, 2)
        if mant >= 10:
            mant, mag = mant / 10, mag + 1
        return vals[0][0] == mant * F(10) ** mag, f"expected {float(grains):.4g}"
    return vals[0][0] == grains, f"expected {grains}"


def num_percentage_of_percentage(v, ans, level):
    subjects = [["maths", "science"], ["French", "history"], ["geography", "English"], ["music", "computing"]]
    if level == "foundational":
        a, b, c, d = v["scores"]
        best = subjects[v["ctx"]][0 if F(a, b) > F(c, d) else 1]
        pcts = nums(ans[0])
        return ans[0].lower().startswith(best.lower()) and pcts == [F(100 * a, b), F(100 * c, d)], f"expected {best}"
    T, p_, q_, r_ = v["total"], v["p"], v["q"], v["r"]
    if level == "core":
        given = T * F(p_, 100) * F(q_, 100)  # the number stated in the question
        want = given / (F(p_, 100) * F(q_, 100))
    else:
        g1 = T * F(p_, 100)
        given = g1 * F(q_, 100) + (T - g1) * F(r_, 100)
        want = given / (F(p_, 100) * F(q_, 100) + F(100 - p_, 100) * F(r_, 100))
    ok = given.denominator == 1 and last_num(ans[0]) == want
    return ok, f"expected {want}"


def alg_quadratic_area(v, ans, level):
    if level == "stretch":
        a, b = v["a"], v["b"]
        # x^2 + (x+a)^2 = (x+b)^2  ->  x^2 - 2(b-a)x + (a^2 - b^2) = 0
        x = (b - a) + math.sqrt((b - a) ** 2 + b * b - a * a)
        area = x * (x + a) / 2
        shown = last_num(ans[0])
        if v["calc"]:
            return shown == round_sf(area, 3), f"expected {area:.4g}"
        return abs(float(shown) - area) < 1e-9, f"expected {area}"
    k, p_, r_, area = v["k"], v["p"], v["r"], v["area"]
    A2, B1, C0 = k, p_ + k * r_, p_ * r_ - area
    disc = B1 * B1 - 4 * A2 * C0
    sq = isqrt_exact(disc)
    if sq is None:
        return False, "no rational root"
    roots = [F(-B1 + sq, 2 * A2), F(-B1 - sq, 2 * A2)]
    good = [x for x in roots if k * x + p_ > 0 and x + r_ > 0]
    if len(good) != 1:
        return False, f"roots {roots}"
    x = good[0]
    per = 2 * (k * x + p_ + x + r_)
    ok = last_num(ans[-1]) == per
    if level == "foundational":
        # The equation to show: read its coefficients and test the root.
        lhs = ans[0].replace("$", "").split("=")[0].replace(" ", "")
        cs = {2: 0, 1: 0, 0: 0}
        for mm in re.finditer(r"([+-]?)(\d*)(x\^2|x)?", lhs):
            if not mm.group(0):
                continue
            c = (-1 if mm.group(1) == "-" else 1) * (int(mm.group(2)) if mm.group(2) else 1)
            cs[2 if mm.group(3) == "x^2" else 1 if mm.group(3) == "x" else 0] += c if (mm.group(3) or mm.group(2)) else 0
        ok = ok and ans[0].replace("$", "").split("=")[1].strip() == "0" and (cs[2], cs[1], cs[0]) == (A2, B1, C0)
    return ok, f"expected {per} cm"


def alg_algebraic_proof(v, ans, level):
    """Rebuild the whole expected answer independently, and test the claim numerically."""
    kind, k = v["kind"], v["k"]

    def poly(cs, var="n"):
        deg = len(cs) - 1
        out = ""
        for i, c in enumerate(cs):
            if c == 0:
                continue
            pw = deg - i
            a = abs(c)
            body = str(a) if pw == 0 else f"{'' if a == 1 else a}{var}{'' if pw == 1 else '^' + str(pw)}"
            out += (("-" if c < 0 else "") + body) if not out else ((" - " if c < 0 else " + ") + body)
        return out or "0"

    def value(n):
        if kind == "consec-int":
            return sum(n + i for i in range(k))
        if kind == "consec-even":
            return sum(2 * n + 2 * i for i in range(k))
        if kind == "consec-odd":
            return sum(2 * n + 1 + 2 * i for i in range(k))
        if kind == "odd-square":
            return (2 * n + 1) ** 2
        if kind == "sum-squares":
            return n * n + (n + 1) ** 2
        return (v["a"] * n + v["b"]) ** 2 - (v["c"] * n + v["d"]) ** 2

    for n in range(1, 80):
        x = value(n)
        bad = (x - 1) % 8 if kind == "odd-square" else x % 2 == 0 if kind == "sum-squares" else x % v["g"]
        if bad:
            return False, f"claim fails at n = {n}"
    if kind == "odd-square":
        want = "$(2n + 1)^2 = 4n^2 + 4n + 1 = 4n(n + 1) + 1$; $n(n + 1)$ is even, so $4n(n + 1)$ is a multiple of 8"
        return ans[0] == want, want
    if kind == "sum-squares":
        want = "$n^2 + (n + 1)^2 = 2n^2 + 2n + 1 = 2(n^2 + n) + 1$, which is 1 more than an even number, so it is odd"
        return ans[0] == want, want
    # Coefficients from values at n = 0, 1, 2 (finite differences).
    y0, y1, y2 = value(0), value(1), value(2)
    A = (y2 - 2 * y1 + y0) // 2
    B = y1 - y0 - A
    C = y0
    if kind.startswith("consec"):
        first, step_ = {"consec-int": (1, 0), "consec-even": (2, 0), "consec-odd": (2, 1)}[kind]
        d = 1 if kind == "consec-int" else 2
        terms = [poly([first, step_ + d * i]) for i in range(k)]
        setup = " + ".join(t if i == 0 else f"({t})" for i, t in enumerate(terms))
    else:
        setup = f"({poly([v['a'], v['b']])})^2 - ({poly([v['c'], v['d']])})^2"
    g = v["g"]
    inner = [A // g, B // g, C // g]
    fac = f"{g} \\times {poly(inner)}" if sum(1 for c in inner if c) == 1 else f"{g}({poly(inner)})"
    want = f"${setup} = {poly([A, B, C])} = {fac}$, which is a multiple of {g}"
    return ans[0] == want, want


def alg_straight_line(v, ans, level):
    A, B = v["A"], v["B"]
    t = ans[0]
    if level == "foundational":
        m = re.fullmatch(r"\$y = (-?)(\d*)x(?: ([+-]) (\d+))?\$", t)
        if not m:
            return False, "format"
        grad = (-1 if m.group(1) else 1) * (int(m.group(2)) if m.group(2) else 1)
        c = (-1 if m.group(3) == "-" else 1) * int(m.group(4)) if m.group(3) else 0
        return all(grad * x + c == y for x, y in (A, B)), f"line {grad}x + {c}"
    if level == "core":
        a, b = v["a"], v["b"]
        P, R = v["P"], v["R"]
        g = F(b, a)
        c = P[1] - g * P[0]
        yR = g * R[0] + c
        on = yR == R[1]
        got = signed_nums(t)  # gradient, c, x, y, (given y)
        want = [g] + ([c] if c != 0 else []) + [R[0], yR] + ([] if on else [R[1]])
        ok = t.startswith("Yes" if on else "No") and got == want
        return ok, f"want {want}"
    m = F(B[1] - A[1], B[0] - A[0])
    xy = signed_nums(t)
    if v["tier"] == "H":
        Mx, My = F(A[0] + B[0], 2), F(A[1] + B[1], 2)
        k = My + Mx / m  # perpendicular gradient is -1/m
        return xy == [0, k], f"expected (0, {k})"
    x0 = A[0] - F(A[1]) / m
    return xy == [x0, 0], f"expected ({x0}, 0)"


def geom_transformations(v, ans, level):
    def step_map(kind, p):
        if kind == "translate":
            return lambda x, y: (x + p[0], y + p[1])
        if kind == "reflectX":
            return lambda x, y: (2 * p[0] - x, y)
        if kind == "reflectY":
            return lambda x, y: (x, 2 * p[0] - y)
        if kind == "reflectYX":
            return lambda x, y: (y, x)
        if kind == "reflectYnegX":
            return lambda x, y: (-y, -x)
        if kind == "rotate":
            ang, a, b = p
            turns = {90: 1, 180: 2, 270: 3}[ang]

            def rot(x, y):
                dx, dy = x - a, y - b
                for _ in range(turns):
                    dx, dy = -dy, dx  # 90 degrees anticlockwise
                return (a + dx, b + dy)

            return rot
        k = F(p[0], p[1])
        return lambda x, y: (p[2] + k * (x - p[2]), p[3] + k * (y - p[3]))

    pts = [tuple(map(F, q_)) for q_ in v["A"]]
    image = pts
    for s_ in v["steps"]:
        f = step_map(s_["kind"], s_["p"])
        image = [f(*q_) for q_ in image]
    d = ans[0]
    if d.startswith("Translation"):
        a, b = signed_nums(d)
        g = lambda x, y: (x + a, y + b)
    elif d.startswith("Reflection"):
        if "y = x" in d:
            g = lambda x, y: (y, x)
        elif "y = -x" in d:
            g = lambda x, y: (-y, -x)
        elif "$x =" in d:
            k = signed_nums(d)[0]
            g = lambda x, y: (2 * k - x, y)
        else:
            k = signed_nums(d)[0]
            g = lambda x, y: (x, 2 * k - y)
    elif d.startswith("Rotation"):
        nums_ = signed_nums(d)
        cx, cy = nums_[-2], nums_[-1]
        if not re.match(r"Rotation (90° clockwise|90° anticlockwise|180°) about", d):
            return False, "angle"
        turns = 2 if "180" in d else 1 if "anticlockwise" in d else 3

        def g(x, y):
            dx, dy = x - cx, y - cy
            for _ in range(turns):
                dx, dy = -dy, dx
            return (cx + dx, cy + dy)

    elif d.startswith("Enlargement"):
        nums_ = signed_nums(d.split("centre")[0])
        k = nums_[0]
        cx, cy = signed_nums(d.split("centre")[1])
        g = lambda x, y: (cx + k * (x - cx), cy + k * (y - cy))
    else:
        return False, "unknown description"
    got = sorted(g(*q_) for q_ in pts)
    return got == sorted(image), f"image {sorted(image)}"


def stats_cumulative_frequency(v, ans, level):
    start, w = v["ctx"]["start"], v["ctx"]["w"]
    f = v["freqs"]
    n = sum(f)

    def x_at(c):
        cum = 0
        for i, fi in enumerate(f):
            if cum + fi >= c:
                return start + i * w + (c - cum) * F(w, fi)
            cum += fi

    def cf_at(x):
        cum = 0
        for i, fi in enumerate(f):
            lo = start + i * w
            if x <= lo + w:
                return cum + fi * F(x - lo, w)
            cum += fi

    def accepts(text, val):
        m = re.search(r"accept (-?[\d.]+)%? to (-?[\d.]+)", text)
        return m and F(m.group(1)) <= val <= F(m.group(2))

    half_up = lambda x: math.floor(x + F(1, 2))

    def shown(text, val, tol):
        # "34 (accept 33 to 35)": the value, then floor(val - tol) to ceil(val + tol).
        got = nums(text)
        return got == [half_up(val), math.floor(val - tol), math.ceil(val + tol)]

    med, lq, uq = x_at(F(n, 2)), x_at(F(n, 4)), x_at(F(3 * n, 4))
    if level == "foundational":
        tx = F(w, 5)
        iqr_shown = half_up(uq) - half_up(lq)
        ok = shown(ans[0], med, tx) and nums(ans[1]) == [iqr_shown, math.floor(uq - lq - tx), math.ceil(uq - lq + tx)]
        return ok, f"median {float(med):.2f}, IQR {float(uq - lq):.2f}"
    if level == "core":
        pct = (n - cf_at(v["X"])) * F(100, n)
        tol = F((2 if n <= 60 else 4) * 100, n)
        return shown(ans[0], pct, tol), f"expected {float(pct):.1f}%"
    shown_iqr = half_up(uq) - half_up(lq)
    t = ans[0]
    higher = half_up(med) > v["other"]["med"]
    ok = nums(t)[:3] == [half_up(med), shown_iqr, n] and (v["ctx"]["higher"] in t) == higher
    ok = ok and (("more consistent" in t) == (shown_iqr < v["other"]["iqr"]))
    return ok, f"median {float(med):.2f}, IQR {shown_iqr}"


def prob_tree_diagram(v, ans, level):
    p_, q_ = q(v["p"]), q(v["q"])
    if level == "foundational" or (level == "stretch" and v["tier"] != "H"):
        neither = (1 - p_) * (1 - q_)
        if level == "foundational":
            done = [F(x) for x in re.findall(r"\d+\.\d+|\d+", ans[0])]
            return F(ans[1]) == neither and done == [1 - p_, q_, 1 - q_], f"expected {float(neither)}"
        got = [F(x) for x in re.findall(r"\d+\.\d+|\d+", ans[0])]
        want = [F(1), 1 - p_, 1 - q_, 1 - neither, F(1, 2)]
        return ans[0].startswith("Yes" if 1 - neither > F(1, 2) else "No") and got == want, f"P(at least one) {float(1 - neither)}"
    r, b = v["r"], v["b"]
    n = r + b
    if level == "core":
        same = F(r, n) * F(r - 1, n - 1) + F(b, n) * F(b - 1, n - 1)
        raw = [tuple(map(int, m)) for m in re.findall(r"\\frac\{(\d+)\}\{(\d+)\}", ans[0])]
        want = [(r - 1, n - 1), (b, n - 1), (r, n - 1), (b - 1, n - 1)]
        return frac_of(ans[1]) == same and raw == want, f"expected {same}"
    P = F(r * (r - 1), n * (n - 1))
    c = F(r * (r - 1)) / P  # n(n - 1)
    root = (1 + math.isqrt(int(1 + 4 * c))) // 2
    g_ = math.gcd(P.numerator, P.denominator)
    want0 = f"$\\frac{{{r}}}{{n}} \\times \\frac{{{r - 1}}}{{n - 1}} = \\frac{{{P.numerator}}}{{{P.denominator}}}$, so $n^2 - n - {int(c)} = 0$"
    return nums(ans[1])[0] == root and ans[0] == want0 and g_ == 1, f"expected n = {root}"


def prob_venn_diagram(v, ans, level):
    if level == "core":
        N, a = v["N"], v["a"]
        tests = [
            lambda x: x % 2 == 1,
            lambda x: 24 % x == 0,
            lambda x: 36 % x == 0,
            lambda x: x > 1 and all(x % d for d in range(2, x)),
            lambda x: math.isqrt(x) ** 2 == x,
        ]
        inB = tests[v["setB"]]
        union = sum(1 for x in range(1, N + 1) if x % a == 0 or inB(x))
        parts_ = dict(re.findall(r"(A only|A and B|B only|outside): ([\d, ]+)", ans[0]))
        region = lambda x: "A and B" if x % a == 0 and inB(x) else "A only" if x % a == 0 else "B only" if inB(x) else "outside"
        want = {r_: ", ".join(str(x) for x in range(1, N + 1) if region(x) == r_) for r_ in ("A only", "A and B", "B only", "outside")}
        return frac_of(ans[1]) == F(union, N) and {k_: v_.strip() for k_, v_ in parts_.items()} == want, f"expected {F(union, N)}"
    n = v["aOnly"] + v["both"] + v["bOnly"] + v["neither"]
    if level == "foundational":
        A_total, B_total = v["aOnly"] + v["both"], v["bOnly"] + v["both"]
        a_only = A_total - v["both"]
        b_only = B_total - v["both"]
        neither = n - a_only - b_only - v["both"]
        want = {"aOnly": a_only, "neither": neither, "one": a_only + b_only}[v["ask"]]
        regions = [int(x) for x in re.findall(r"\d+", ans[0])]
        return frac_of(ans[1]) == F(want, n) and regions == [a_only, v["both"], b_only, neither], f"expected {F(want, n)}"
    Bt = v["bOnly"] + v["both"]
    x = F(n - Bt - v["neither"], v["k"])
    want = x / Bt if v["tier"] == "H" else (v["k"] * x + Bt - x) / n
    return frac_of(ans[0]) == want, f"expected {want}"


# ---------------------------------------------------------------- batch 5


def num_index_equations(v, ans, level):
    P = v["P"]
    if level == "foundational":
        n = v["u"][0] * v["e"][0] + v["u"][1] * v["e"][1] - v["u"][2] * v["e"][2]
        r, s_, q_, p_ = v["frac"]
        val = F(s_, r) ** p_  # (r^q / s^q)^(-p/q) = (s/r)^p
        ok = ans[0] == f"${P}^{{{n}}}$" and frac_of(ans[1]) == val and math.gcd(val.numerator, val.denominator) == 1
        return ok, f"expected {P}^{n}, {val}"
    if level == "core":
        u, w = v["u"]
        p_, q_ = v["shift"]
        # u(x + p) = w(x + q)
        x = F(w * q_ - u * p_, u - w)
        return ans[0] == f"$x = {x}$", f"expected x = {x}"
    u, w = v["u"][1], v["w"][1]
    A = v["x"] + u * v["y"]
    B = v["x"] - w * v["y"]
    # x + u y = A, x - w y = B
    y = F(A - B, u + w)
    x = A - u * y
    return ans[0] == f"$x = {x}$, $y = {y}$", f"expected x = {x}, y = {y}"


def num_recurring_decimals(v, ans, level):
    def frac_of_dec(d):
        pre, rep = d["pre"], d["rep"]
        # x = 0.pre(rep)… : 10^(len pre + len rep) x - 10^(len pre) x = int(pre+rep) - int(pre)
        return F(int(pre + rep) - int(pre or "0"), 10 ** (len(pre) + len(rep)) - 10 ** len(pre))

    want = frac_of_dec(v["a"]) + (frac_of_dec(v["b"]) if level == "stretch" else 0)
    m = re.fullmatch(r"\$\\frac\{(\d+)\}\{(\d+)\}\$", ans[0])
    return bool(m) and (int(m.group(1)), int(m.group(2))) == (want.numerator, want.denominator), f"expected {want}"


def num_counting(v, ans, level):
    if level == "foundational":
        a, b, c = v["counts"]
        return nums(ans[0]) + nums(ans[1]) == [a * b * c, b * (a + c)], f"expected {a * b * c}, {b * (a + c)}"
    if level == "core":
        L, rule = v["L"], v["rule"]
        if rule == "evenEnd" or rule == "oddEnd":
            want = 9 * 10 ** (L - 2) * 5
        elif rule == "noRepeat":
            want = 9 * math.perm(9, L - 1)
        elif rule == "allOdd":
            want = math.perm(5, L)
        else:
            want = math.perm(9, L - 1)
        return int(ans[0].replace(" ", "").replace(" ", "")) == want, f"expected {want}"
    n = v["teams"]
    M = n * (n - 1) // (1 if v["twice"] else 2)
    # Solve n^2 - n - k = 0 for k = M (twice) or 2M (once).
    k = M if v["twice"] else 2 * M
    root = (1 + math.isqrt(1 + 4 * k)) // 2
    return ans[0] == str(root) and root * (root - 1) == k, f"expected {root}"


def alg_inequalities(v, ans, level):
    ops = {"<": lambda a, b: a < b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, ">=": lambda a, b: a >= b}
    tex = {"<": "<", "<=": "\\leqslant", ">": ">", ">=": "\\geqslant"}
    if level == "foundational":
        k = F(v["d"] - v["b"], v["a"] - v["c"])
        n = {">": math.floor(k) + 1, ">=": math.ceil(k), "<": math.ceil(k) - 1, "<=": math.floor(k)}[v["op"]]
        return ans[0] == f"$x {tex[v['op']]} {k}$" and ans[1] == f"$n = {n}$", f"expected x {v['op']} {k}, n = {n}"
    got = [int(t) for t in ans[0].replace("−", "-").split(",")]
    xs = range(-200, 201)
    if level == "core":
        want = [n for n in xs if ops[v["ops"][0]](v["lo"], v["q"] * n + v["r"]) and ops[v["ops"][1]](v["q"] * n + v["r"], v["hi"])]
    elif v["tier"] != "H":
        want = [x for x in xs if ops[v["op"]](v["a"] * x + v["b"], v["c"] * x + v["d"]) and ops[v["op2"]](v["r1"] * x + v["r2"], v["lo"])]
    else:
        want = [x for x in xs if ops[v["op"]]((x - v["r1"]) * (x - v["r2"]), 0) and ops[v["op2"]](v["a"] * x + v["b"], v["d"])]
    return got == want, f"expected {want}"


def alg_formulae(v, ans, level):
    if level == "foundational":
        rate, fixed = F(v["rate"], 100), F(v["fixed"], 100)
        h1, h2 = v["h"]
        cost2 = fixed + rate * h2
        back = (cost2 - fixed) / rate
        return last_num(ans[0]) == fixed + rate * h1 and nums(ans[1])[0] == back, f"expected £{float(fixed + rate * h1)}, {back}"
    g = {k: q(x) for k, x in v["vals"].items()}
    got = signed_nums(ans[0])[-1]
    if level == "core":
        want = [(g["v"] - g["u"]) / g["a"] if "t" in g else None, (g["F"] - 32) * 5 / 9 if "F" in g else None, 2 * g["A"] / (g["a"] + g["b"]) if "A" in g else None][v["ctx"]]
        return got == want, f"expected {want}"
    sq = g["v"] ** 2 - 2 * g["a"] * g["s"] if v["ctx"] == 0 else 2 * g["E"] / g["m"]
    root = math.sqrt(sq)
    if v["calc"]:
        return got == round_sf(root, 3), f"expected {root:.4g}"
    return got * got == sq, f"expected {root}"


def alg_completing_square(v, ans, level):
    a, p_, q_ = v["a"], v["p"], v["q"]
    A, B, C = a, 2 * a * p_, a * p_ * p_ + q_
    # Turning point from calculus-free symmetry: x = -B / 2A.
    x0 = F(-B, 2 * A)
    y0 = A * x0 * x0 + B * x0 + C
    tp = f"$({x0}, {y0})$"
    if level == "foundational":
        lead = "" if a == 1 else "-" if a == -1 else str(a)
        form = f"${lead}(x {'-' if x0 > 0 else '+'} {abs(x0)})^2 {'-' if y0 < 0 else '+'} {abs(y0)}$"
        return ans[0] == form and ans[1] == tp, f"expected {form}, {tp}"
    if level == "core":
        crosses = B * B - 4 * A * C > 0
        return ans[0] == tp and ans[1].startswith("Yes" if crosses else "No") and f"${y0}$" in ans[1], f"expected {tp}"
    lead = "" if a == 1 else "-" if a == -1 else str(a)
    form = f"${lead}(x {'-' if x0 > 0 else '+'} {abs(x0)})^2 {'-' if y0 < 0 else '+'} {abs(y0)}$"
    kind = "minimum" if A > 0 else "maximum"
    return ans[0] == form and ans[1] == f"{tp}, a {kind}", f"expected {form}, {tp} {kind}"


def geom_volume(v, ans, level):
    l, w, h = v["dims"]
    if level == "foundational":
        secs = F(l * w * h, 1000) / v["rate"] * 60
        mm, ss = divmod(int(secs), 60)
        want = f"{mm} minutes" + (f" {ss} seconds" if ss else "")
        return secs.denominator == 1 and ans[0] == want, want
    if level == "core":
        depth = math.pi * v["r"] ** 2 * v["h"] / (l * w)
        return last_num(ans[0]) == round_dp(depth, 1) and depth < h, f"expected {depth:.3f}"
    if v["tier"] == "H":
        n = (4 * v["r"] ** 3) // (v["R"] ** 2 * v["h"])  # pi and the thirds cancel
        return ans[0] == str(n), f"expected {n}"
    n = math.floor(l * w * h / (math.pi * v["r"] ** 2 * v["h"]))
    return ans[0] == str(n), f"expected {n}"


def geom_sectors(v, ans, level):
    r, ang = v["r"], v["angle"]
    if level == "foundational":
        A = ang / 360 * math.pi * r * r
        P = ang / 360 * 2 * math.pi * r + 2 * r
        return nums(ans[0])[0] == round_dp(A, 1) and nums(ans[1])[0] == round_dp(P, 1), f"expected {A:.2f}, {P:.2f}"
    if level == "core":
        grass = v["a"] * v["b"] - math.pi * r * r / 4
        n = math.ceil(grass / v["cover"])
        return nums(ans[0])[0] == n, f"expected {n}"
    if v["tier"] == "H":
        rr = math.sqrt(v["given"] * 360 / (math.pi * ang))
        P = ang / 360 * 2 * math.pi * rr + 2 * rr
        return nums(ans[0])[0] == round_sf(P, 3), f"expected {P:.4g}"
    a = v["given"] / (2 * math.pi * r) * 360
    return nums(ans[0])[0] == round(a), f"expected {a:.2f}"


def geom_bearings(v, ans, level):
    if level == "foundational":
        want = [f"{(b + 180) % 360:03d}°" for b in (v["b1"], v["b2"])]
        return ans == want, f"expected {want}"
    def comp(d, b):
        return d * math.sin(math.radians(b)), d * math.cos(math.radians(b))
    if level == "core":
        e, n = comp(v["d1"], v["b1"])
        return nums(ans[0])[0] == round_dp(abs(e), 1) and nums(ans[1])[0] == round_dp(abs(n), 1), f"expected {abs(e):.2f}, {abs(n):.2f}"
    e1, n1 = comp(v["d1"], v["b1"])
    e2, n2 = comp(v["d2"], v["b2"])
    E, N = e1 + e2, n1 + n2
    dist = math.hypot(E, N)
    brg = math.degrees(math.atan2(-E, -N)) % 360
    return nums(ans[0])[0] == round_dp(dist, 1) and ans[1] == f"{round(brg) % 360:03d}°", f"expected {dist:.2f}, {brg:.2f}"


def stats_frequency_table(v, ans, level):
    vals, f = v["values"], v["freqs"]
    if level == "foundational":
        data = [x for x, k in zip(vals, f) for _ in range(k)]
        n = len(data)
        med = F(data[n // 2]) if n % 2 else F(data[n // 2 - 1] + data[n // 2], 2)
        mode = max(set(data), key=data.count)
        mean = F(sum(data), n)
        return [F(a) for a in ans] == [mode, med, mean], f"expected {mode}, {med}, {mean}"
    unk = v["unknown"]
    known_n = sum(k for i, k in enumerate(f) if i not in unk)
    known_s = sum(x * k for i, (x, k) in enumerate(zip(vals, f)) if i not in unk)
    mean = F(sum(x * k for x, k in zip(vals, f)), sum(f))  # the mean stated in the question
    got = [int(t) for t in re.findall(r"= (\d+)", ans[0])]
    if level == "core":
        vx = vals[unk[0]]
        x = (mean * known_n - known_s) / (vx - mean)
        return got == [x], f"expected x = {x}"
    total = sum(f)
    va, vb = vals[unk[0]], vals[unk[1]]
    T = total - known_n
    S = mean * total - known_s
    y = (S - va * T) / (vb - va)
    x = T - y
    return got == [x, y], f"expected {x}, {y}"


def stats_pie_chart(v, ans, level):
    N, f = v["N"], v["freqs"]
    if level == "foundational":
        a, b = v["ask"]
        angle = F(f[a] * 360, N)
        return nums(ans[0])[0] == angle and frac_of(ans[1]) == F(f[b], N), f"expected {angle}, {F(f[b], N)}"
    if level == "core":
        known, find = v["ask"]
        angles = [F(k * 360, N) for k in f]
        missing = 360 - sum(a for i, a in enumerate(angles) if i != find)
        want = missing / (angles[known] / f[known])
        return nums(ans[0])[0] == want, f"expected {want}"
    i = v["ask"][0]
    y7 = F(f[i] * 360, N) / 360 * N
    y11 = F(v["freqs2"][i] * 360, v["N2"]) / 360 * v["N2"]
    ok = ans[0].startswith("Yes" if y11 > y7 else "No") and nums(ans[0])[:4] == [y7, 7, y11, 11]
    return ok, f"Y7 {y7}, Y11 {y11}"


# ---------------------------------------------------------------- batch 6


def ratio_recipes(v, ans, level):
    batches = {0: 10, 1: 8, 2: 12}
    names_ = {0: ["butter", "self-raising flour", "sugar", "milk"], 1: ["plain flour", "milk", "eggs", "butter"], 2: ["oats", "butter", "sugar", "golden syrup"]}
    B, A = batches[v["r"]], v["amounts"]
    if level == "foundational":
        want = [F(a * v["target"], B) for a in A]
        return nums(ans[0]) == want, f"expected {want}"
    def enough(n):
        return all(F(a * n, B) <= h for a, h in zip(A, v["have"]))
    if level == "core":
        ok = ans[0].startswith("Yes" if enough(v["target"]) else "No")
        if not enough(v["target"]):
            short = next(i for i, (a, h) in enumerate(zip(A, v["have"])) if F(a * v["target"], B) > h)
            ok = ok and names_[v["r"]][short] in ans[0] and nums(ans[0])[:2] == [F(A[short] * v["target"], B), F(v["have"][short])]
        return ok, "decision"
    n = min(h * B // a for a, h in zip(A, v["have"]))
    return nums(ans[0])[0] == n, f"expected {n}"


def ratio_inverse_work(v, ans, level):
    work = q(v["t1"]) * v["n1"]  # worker-time units for the whole job
    if level == "foundational":
        return nums(ans[0])[0] == work / v["n2"], f"expected {work / v['n2']}"
    if level == "core":
        mins = work / v["n2"] * q(v["part"]) * 60
        return hm(ans[0]) == mins, f"expected {mins} minutes"
    n = math.ceil(work / v["limit"])
    return nums(ans[0])[0] == n, f"expected {n}"


def ratio_exchange_rates(v, ans, level):
    if level == "foundational":
        rate = q(v["rate"])
        conv = q(v["poundPrice"]) * rate
        paris = q(v["euroPrice"]) < conv
        ok = nums(ans[0])[0] == rate * v["pounds"] and ans[1].startswith("Paris" if paris else "London")
        ok = ok and nums(ans[1])[:2] == [q(v["poundPrice"]), conv]
        return ok, "euros"
    if level == "core":
        spain = q(v["eur"]) * q(v["eurToGbp"]) / v["litres"]
        wales = q(v["gbp"]) / (v["gallons"] * F(9, 2))
        got = nums(ans[0])
        ok = ans[0].startswith("Yes" if spain < wales else "No") and got[0] == round_dp(spain, 3) and got[1] == round_dp(wales, 3)
        return ok, f"spain {float(spain):.4f}, wales {float(wales):.4f}"
    a = F(v["pounds"] * (100 - v["commission"]), 100) * q(v["rate"])
    b = (v["pounds"] - v["fee"]) * q(v["rateB"])
    best = "A" if a > b else "B"
    got = nums(ans[0])
    return ans[0].startswith(f"Bureau {best}") and got == [abs(a - b), a, b], f"A {float(a)}, B {float(b)}"


def ratio_parts(v, ans, level):
    r = v["r"]
    if level == "foundational":
        first = F(v["total"] * r[0], r[0] + r[1])
        want = first - first * q(v["fr"]) - first * F(v["pc"], 100)
        return nums(ans[0])[0] == want, f"expected {want}"
    if level == "core":
        s_ = sum(r)
        parts_ = [F(v["total"] * x, s_) for x in r]
        left = v["total"] - parts_[1] * q(v["rem"][0]) - parts_[2] * q(v["rem"][1])
        want = parts_[0] / left * 100
        return nums(ans[0])[0] == want, f"expected {float(want)}%"
    a, b = r
    c, d = v["after"]
    k = F(v["k"], 100) if v["ctx"] == 0 else F(v["k"])
    x = k * (c - d) / (a * d - b * c)  # d(ax + k) = c(bx + k)
    return nums(ans[0])[0] == a * x, f"expected {a * x}"


def num_profit(v, ans, level):
    if level == "foundational":
        want = F(abs(v["sellP"] - v["costP"]) * 100, v["costP"])
        return nums(ans[0])[0] == want, f"expected {want}%"
    target = F(v["costP"] * (100 + v["pct"]), 100)  # pence
    if level == "core":
        bags = int(q(v["bulkKg"]) * 1000) // v["bagG"]
        pence = math.ceil(target / bags)
    else:
        pence = math.ceil((target - v["soldA"] * v["priceA"]) / (v["n"] - v["soldA"]))
    return nums(ans[0])[0] == F(pence, 100), f"expected £{pence / 100:.2f}"


def geom_pressure_density(v, ans, level):
    got = nums(ans[0])[0]
    if level == "foundational":
        want = q(v["force"]) / (q(v["len"]) * q(v["wid"]))
        return got == want, f"expected {want}"
    if level == "core":
        p_ = q(v["force"]) / (q(v["len"]) * q(v["wid"]))
        want = q(v["force"]) / p_ / q(v["len"])
        return got == want, f"expected {want}"
    if v["tier"] == "H":
        m1, d1, m2, D = q(v["m1"]), q(v["d1"]), q(v["m2"]), q(v["D"])
        d2 = m2 / ((m1 + m2) / D - m1 / d1)
        return got == round_sf(float(d2), 3), f"expected {float(d2):.4g}"
    want = (q(v["d1"]) * v["v1"] + q(v["D"]) * v["v2"]) / (v["v1"] + v["v2"])
    return got == want, f"expected {want}"


def geom_scales(v, ans, level):
    s_ = v["s"]
    a, b = q(v["a"]), q(v["b"])
    if level == "foundational":
        return nums(ans[0])[0] == a * s_ / 100000 and nums(ans[1])[0] == b * 100000 / s_, "map"
    if level == "core":
        return nums(ans[0])[0] == b * s_ / 100, f"expected {b * s_ / 100}"
    area_m2 = a * b * s_ * s_ / 10000
    want = area_m2 / 10000 * v["price"]
    got = F(ans[0].replace("£", "").replace(" ", "").replace(" ", ""))
    return got == want, f"expected £{want}"


def stats_capture_recapture(v, ans, level):
    N = F(v["M"] * v["S"], v["m"])
    if level != "stretch":
        return int(ans[0].replace(" ", "").replace(" ", "")) == N, f"expected {N}"
    got = [int(t) for t in re.findall(r"\d+", ans[0].replace(" ", ""))]
    ok = ans[0].startswith("Yes" if N > v["claim"] else "No") and got[:2] == [N, v["claim"]] and "too big" in ans[1]
    return ok, f"expected {N}"


def prob_frequency_tree(v, ans, level):
    a, b, a1, b1 = v["a"], v["b"], v["a1"], v["b1"]
    labels = [("adult", "child", "passed", "failed"), ("Year 10", "Year 11", "job", "no job"), ("petrol", "diesel", "passed", "failed")][v["ctx"]]
    g0, g1, o0, o1 = labels
    nodes = f"{g0} {a} ({o0} {a1}, {o1} {a - a1}); {g1} {b} ({o0} {b1}, {o1} {b - b1})"
    got, want_nodes = ans[0], nodes
    N = a + b
    # Higher stretch is conditional (out of everyone with outcome 1); Foundation is out of everyone.
    want = F(a - a1, N) if level == "foundational" else F(a1 + b1, N) if level == "core" else F(b1, a1 + b1) if v.get("tier") == "H" else F(b1, N)
    return got == want_nodes and frac_of(ans[1]) == want, f"expected {want_nodes}, {want}"


def alg_travel_graph(v, ans, level):
    d = F(v["d"]).limit_denominator(2)
    v1 = d / v["t1"] * 60
    v3 = d / v["t3"] * 60
    if level == "foundational":
        got = [nums(x)[0] for x in ans]
        return got == [v["stay"], v1 * v["at"] / 60, v1], f"expected {v['stay']}, {v1 * v['at'] / 60}, {v1}"
    if level == "core":
        ok = ans[0].startswith("On the way there" if v1 > v3 else "On the way home") and nums(ans[0])[:2] == [v1, v3]
        return ok, f"{v1} vs {v3}"
    arrive = v["late"] + d / v["vb"] * 60
    leaves = v["t1"] + v["stay"]
    clk = lambda m: f"{int(m) // 60 % 24:02d} {int(m) % 60:02d}"
    times = re.findall(r"\d\d \d\d", ans[0])
    want = [clk(v["start"] + arrive), clk(v["start"] + leaves)]
    return ans[0].startswith("Yes" if arrive < leaves else "No") and times == want, f"times {want}"


def alg_circles_lines(v, ans, level):
    if level == "foundational":
        a, b = v["p"]
        # Tangent: ax + by = r^2, so y = -a/b x + r^2/b
        m, c = F(-a, b), F(v["r2"], b)
        got = signed_nums(ans[0])
        return got == [m, c] or got == [m, c], f"expected y = {m}x + {c}"
    if level == "core":
        dx, dy = v["p"][0] - v["c"][0], v["p"][1] - v["c"][1]
        A, B, C = dx, dy, -(dx * v["p"][0] + dy * v["p"][1])
        g = math.gcd(math.gcd(A, B), C)
        A, B, C = A // g, B // g, C // g
        if A < 0 or (A == 0 and B < 0):
            A, B, C = -A, -B, -C
        got = signed_nums(ans[0].replace("x", " ").replace("y", " "))
        # Coefficients of 1 are not printed; rebuild from the text.
        t = ans[0].strip("$").replace(" ", "")
        m = re.fullmatch(r"(-?\d*)x([+-]\d*)y(?:([+-]\d+))?=0", t)
        if not m:
            return False, "format"
        co = lambda s_: -1 if s_ == "-" else 1 if s_ in ("", "+") else int(s_)
        return (co(m.group(1)), co(m.group(2)), int(m.group(3) or 0)) == (A, B, C), f"expected {A}x + {B}y + {C} = 0"
    m = F(v["q"][1] - v["p"][1], v["q"][0] - v["p"][0])
    c = v["p"][1] - m * v["p"][0]
    # (1 + m^2)x^2 + 2mcx + c^2 - r^2 = 0
    A, B, C = 1 + m * m, 2 * m * c, c * c - v["r2"]
    disc = B * B - 4 * A * C
    root = isqrt_exact(disc)
    xs = sorted([(-B - root) / (2 * A), (-B + root) / (2 * A)])
    want = [n for x in xs for n in (x, m * x + c)]
    return signed_nums(ans[0]) == want, f"expected {want}"


def alg_iteration(v, ans, level):
    k, c, p0 = q(v["k"]), q(v["c"]), q(v["p0"])
    half_up = lambda x: math.floor(x + F(1, 2))
    if level == "foundational":
        p3 = k * k * p0
        n = 1
        while k ** n <= 2:
            n += 1
        got = int(ans[0].replace(" ", "").replace(" ", ""))
        return got == half_up(p3) and nums(ans[1])[0] == n, f"expected {half_up(p3)}, {n}"
    if level == "core":
        x = p0
        for _ in range(3):
            x = k * x + c
        got = F(ans[1].replace("£", "").replace(" ", "").replace(" ", ""))
        return signed_nums(ans[0]) == [k] and got == half_up(x), f"expected a = {k}, £{half_up(x)}"
    L = c / (1 - k)
    x, n = p0, 0
    while x >= q(v["target"]):
        x = k * x + c
        n += 1
    return nums(ans[0])[0] == n and nums(ans[1])[0] == round_dp(L, 2), f"expected {n}, {float(L):.3f}"


# ---------------------------------------------------------------- batch 7


def nums7(text):
    """nums(), with Edexcel thousands spaces (non-breaking) removed first."""
    return nums(text.replace("\xa0", ""))


def pence_of(text):
    return nums7(text)[0] * 100


def num_error_intervals(v, ans, level):
    if level == "foundational":
        val, u, t = q(v["value"]), q(v["unit"]), q(v["trunc"])
        lo, hi = nums7(ans[0])[0], nums7(ans[0])[1]
        tlo, thi = nums7(ans[1])[0], nums7(ans[1])[1]
        return (lo, hi, tlo, thi) == (val - u / 2, val + u / 2, t, t + F(1, 10)), f"{val} ± {u / 2}"
    if level == "core":
        c, u = v["count"], v["unitN"]
        ok = [n for n in range(c - u, c + u + 1) if (n + u // 2) // u * u == c]
        got = [int(a.replace("\xa0", "")) for a in ans[:2]]
        m = q(v["value"])
        return got == [ok[0], ok[-1]] and ans[2].startswith("No") and nums7(ans[2])[:2] == [m + F(5, 100), m + F(45, 1000)], f"{ok[0]}..{ok[-1]}"
    (s1, s2), (a, b) = v["s"], v["ab"]
    want = [n for n in range(0, 100000) if int(Decimal(n / s1).quantize(0, ROUND_HALF_UP)) * s1 == a and int(Decimal(n / s2).quantize(0, ROUND_HALF_UP)) * s2 == b]
    return ans[0] == ", ".join(map(str, want)), f"{want}"


def num_hcf_problems(v, ans, level):
    if level == "stretch":
        P = [2, 3, 5, 7]
        A = math.prod(p ** k for p, k in zip(P, v["ea"]))
        B = math.prod(p ** k for p, k in zip(P, v["eb"]))
        def val(t):
            return math.prod(int(b) ** int(e or 1) for b, e in re.findall(r"(\d+)(?:\^\{(\d+)\})?", t.replace("$", "")))
        return val(ans[0]) == math.gcd(A, B) and val(ans[1]) == A * B // math.gcd(A, B), f"{math.gcd(A, B)}"
    g = math.gcd(*v["nums"])
    want = g if level == "foundational" else sum(n // g for n in v["nums"])
    return ans[0] == str(want), f"{want}"


def stats_scatter_graph(v, ans, level):
    ctx = [(0, 5), (10, 10), (0, 5), (0, 20)][v["ctx"]]
    x0, ys = ctx
    pts = v["pts"][:-1] if v["outlier"] else v["pts"]
    n = len(pts)
    mx, my = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
    b = sum((p[0] - mx) * (p[1] - my) for p in pts) / sum((p[0] - mx) ** 2 for p in pts)
    L = lambda x: q(v["m"]) * (x - x0) + q(v["c"])
    if level == "foundational":
        o = v["pts"][-1]
        est = nums7(ans[2])[0]
        return (ans[0].startswith("Positive") == (b > 0) and ans[1] == f"({o[0]}, {o[1]})" and est == L(v["x0"]) and abs(float(est) - (my + b * (v["x0"] - mx))) <= 2 * ys), f"LSQ {my + b * (v['x0'] - mx):.1f}"
    if level == "core":
        return nums7(ans[0])[0] == v["x0"] and nums7(ans[1])[0] == v["xFar"] > max(p[0] for p in pts), "reverse"
    return nums7(ans[0])[0] == abs(q(v["m"])) and abs(float(nums7(ans[0])[0]) - abs(b)) <= abs(float(q(v["m"]))) * 0.5 and ans[1].startswith("No"), f"LSQ slope {b:.2f}"


def prob_sample_space(v, ans, level):
    pairs = [(x, y) for x in v["a"] for y in v["b"]]
    n = len(pairs)
    if level == "foundational":
        totals = [x + y for x, y in pairs]
        counts = {t: totals.count(t) for t in totals}
        mode = max(counts, key=lambda t: (counts[t], -t))
        return frac_of(ans[0]) == F(counts[v["target"]], n) and ans[1] == str(mode), f"{counts}"
    if level == "core":
        even = sum(1 for x, y in pairs if x * y % 2 == 0)
        fr = [F(int(a), int(b)) for a, b in re.findall(r"\\frac\{(\d+)\}\{(\d+)\}", ans[0])]
        winner = v["names"][0] if 2 * even > n else v["names"][1]
        return ans[0].startswith("No") and 2 * even != n and fr == [F(even, n), F(n - even, n)] and winner in ans[0], f"{even}/{n}"
    wins = F(sum(1 for x, y in pairs if x + y >= v["target"]), n) * v["plays"]
    profit = F(v["plays"] * v["costP"]) - wins * v["prizeP"]
    return pence_of(ans[0]) == profit, f"{profit}p"


def alg_shape_expressions(v, ans, level):
    x = v["x"]
    if level == "foundational":
        return ans[0] == f"$x = {x}$" and nums7(ans[1])[0] == (v["a"] * x + v["b"]) * (x + v["d"]), "rectangle"
    if level == "core":
        return 6 * x + v["p"] + v["q"] - v["r"] == 4 * (x + v["s"]) and nums7(ans[0])[0] == (x + v["s"]) ** 2, "square"
    R, S = (2 * x + v["u"]) * (x - v["w"]), (x + v["t"]) ** 2
    return ("rectangle" if R > S else "square") in ans[0] and nums7(ans[0])[0] == abs(R - S), f"{R} vs {S}"


def geom_unit_conversion(v, ans, level):
    if level == "foundational":
        return nums7(ans[0])[0] == q(v["m2"]) * 10000 and nums7(ans[1])[0] == F(v["rug"][0] * v["rug"][1], 10000), "units"
    if level == "core":
        grams = F(v["lawn"][0], 100) * F(v["lawn"][1], 100) * v["rate"]
        boxes = math.ceil(grams / v["boxG"])
        return pence_of(ans[0]) == boxes * v["priceP"], f"{boxes} boxes"
    l, w, h = q(v["tank"][0]), v["tank"][1], v["tank"][2]
    mins = l * 100 * w * h / 1000 / v["flow"]
    hh, mm = divmod(int(mins), 60)
    got = re.findall(r"(\d+) (hour|minute)", ans[0])
    total = sum(int(k) * (60 if u == "hour" else 1) for k, u in got)
    return total == mins, f"{mins} min"


def prob_relative_frequency(v, ans, level):
    if level == "foundational":
        N = sum(v["freq"])
        rf = F(v["freq"][v["colour"]], N)
        return frac_of(ans[0]) == rf and nums7(ans[1])[0] == rf * v["more"], f"{rf}"
    if level == "core":
        return ans[0].startswith("Probably not") and nums7(ans[0]) == [F(v["rolls"], 6), v["sixes"]] and F(v["sixes"], v["rolls"]) > F(1, 6) * F(3, 2) and v["rolls"] > v["small"][0] and ans[1].startswith(v["names"][0]), "fair"
    (n1, r1), (n2, r2) = v["trials"]
    p = F(r1 + r2, n1 + n2)
    return frac_of(ans[0]) == p * p, f"{p}²"


def num_surds(v, ans, level):
    def val(t):
        m = re.search(r"(\d*)\\sqrt\{(\d+)\}", t)
        return int(m.group(1) or 1) * math.sqrt(int(m.group(2))) if m else float(nums(t)[0])
    if level == "foundational":
        side = math.sqrt(v["k"] ** 2 * v["m"])
        return math.isclose(val(ans[0]), side) and math.isclose(val(ans[1]), 4 * side), "side"
    if level == "core":
        a, b = v["a"], v["b"]
        return nums7(ans[0])[0] == a * a - b and nums7(ans[1])[0] == 4 * a, "area"
    L = v["k"] * v["m"] / math.sqrt(v["m"])
    simplest = all(int(i) % (f * f) for t in ans for i in re.findall(r"\\sqrt\{(\d+)\}", t) for f in range(2, 12) if f * f <= int(i))
    return math.isclose(val(ans[0]), L) and math.isclose(val(ans[1]), math.hypot(L, math.sqrt(v["m"]))) and simplest, "length"


def alg_functions(v, ans, level):
    a, b = v["a"], v["b"]
    sign = lambda t: -1 if "-" in t or "−" in t else 1
    if level == "foundational":
        fk = a * v["k"] + b
        x = F(v["t"] - b, a)
        return sign(ans[0]) * nums7(ans[0])[0] == fk and sign(ans[1]) * nums7(ans[1])[0] == x, f"{fk}, {x}"
    if level == "core":
        g = v["k"] ** 2 + v["c"]
        inv_ok = ans[1].replace(" ", "") == f"$f^{{-1}}(x)=\\frac{{x{'-' if b > 0 else '+'}{abs(b)}}}{{{a}}}$"
        return sign(ans[0]) * nums7(ans[0])[0] == a * g + b and inv_ok, f"{a * g + b}"
    s = v["s"]
    want = sorted([F(s - b, a), F(-s - b, a)], reverse=True)
    got = [(-1 if m.group(1) else 1) * (F(int(m.group(2)), int(m.group(3))) if m.group(2) else F(int(m.group(4)))) for m in re.finditer(r"x = (-?)(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))", ans[0])]
    return got == want, f"{want}"


def alg_quadratic_sequences(v, ans, level):
    a, b, c = v["a"], v["b"], v["c"]
    T = lambda n: a * n * n + b * n + c
    if level == "foundational":
        t = [T(n) for n in range(1, 6)]
        d2 = (t[2] - 2 * t[1] + t[0])
        A = F(d2, 2)
        lin = [t[i] - A * (i + 1) ** 2 for i in range(5)]
        B = lin[1] - lin[0]
        C = lin[0] - B
        def poly(A, B, C):
            out = ""
            for k, pw in ((A, "n^2"), (B, "n"), (C, "")):
                if k == 0:
                    continue
                body = f"{'' if abs(k) == 1 and pw else abs(k)}{pw}"
                out += (("-" if k < 0 else "") + body) if not out else (f" {'-' if k < 0 else '+'} {body}")
            return out
        return ans[0] == f"${poly(A, B, C)}$", poly(A, B, C)
    if level == "core":
        k = next(n for n in range(1, 200) if T(n) >= v["N"])
        want = f"Yes: it is the {k}th term" if T(k) == v["N"] else f"No: the {k - 1}th term is {T(k - 1)} and the {k}th term is {T(k)}"
        return ans[0] == want, want
    t2, t5 = T(2), T(5)
    # 4a + 2b = t2, 25a + 5b = t5  ->  a = (2 t5 - 5 t2) / 30
    A = F(2 * t5 - 5 * t2, 30)
    B = (t2 - 4 * A) / 2
    return ans[0] == f"$a = {A}$, $b = {B}$", f"a={A}, b={B}"

# ---------------------------------------------------------------- A-level: Year 12 Pure


def signed_nums(text):
    """Every number in an answer, keeping minus signs; fractions read exactly. Exponents are skipped."""
    t = re.sub(r"\^\{(?:[^{}]|\{[^{}]*\})*\}|\^\d", " ", text.replace("$", " ").replace("−", "-"))
    out = []
    for m in re.finditer(r"(-\s*)?\\frac\{(\d+)\}\{(\d+)\}|(-\s*)?(\d+(?:\.\d+)?)", t):
        if m.group(2):
            x = F(int(m.group(2)), int(m.group(3)))
            out.append(-x if m.group(1) else x)
        else:
            x = F(m.group(5))
            out.append(-x if m.group(4) else x)
    return out


def near(a, b, tol):
    return abs(float(a) - float(b)) <= tol


def poly_eval(co, x):
    out = 0
    for c in co:
        out = out * x + c
    return out


def y12_quadratic_roots(v, ans, level):
    if level == "foundational":
        d = v["b"] ** 2 - 4 * v["a"] * v["c"]
        ok = signed_nums(ans[0])[0] == d and signed_nums(ans[2])[-1] == F(d, 4 * v["a"]) and (("2" in ans[1]) == (d > 0))
        return ok, f"discriminant {d}"
    if level == "core":
        al, be, b = v["alpha"], v["beta"], v["b"]
        c = al + be
        # Scan k: two distinct roots when the discriminant of kx² + 2bx + (c − k) is positive.
        lo = hi = None
        for i in range(1, 2000):
            k = F(i, 100)
            two = (2 * b) ** 2 - 4 * k * (c - k) > 0
            if not two and lo is None:
                lo = k
            if not two:
                hi = k
        nums = signed_nums(ans[1])
        return abs(float(lo) - float(nums[1])) < 0.02 and abs(float(hi) - float(nums[2])) < 0.02, f"{lo} {hi}"
    b, c = v["b"], v["c"]
    # Try every whole k: the line y = kx − 1 is a tangent when the quadratic has one root.
    ks = [k for k in range(-200, 200) if (b - k) ** 2 - 4 * (c + 1) == 0]
    k = max(ks)
    x = F(k - b, 2)
    y = k * x - 1
    nums = signed_nums(ans[2])
    return signed_nums(ans[1]) == sorted(ks) and nums == [x, y], f"k {ks} contact {x},{y}"


def y12_quadratic_model(v, ans, level):
    a, p, top = q(v["a"]), v["p"], v["top"]
    if level == "foundational":
        c = top - a * p * p
        # The maximum from −b/2a of the expanded form.
        x = F(2 * a * p, 2 * a)
        return x == p and -a * x * x + 2 * a * p * x + c == top and signed_nums(ans[1]) == [top, p], "vertex"
    if level == "core":
        start = v["start"]
        if top - a * p * p != start:
            return False, "start height"
        d = float(a)
        # Quadratic formula on the expanded form −ax² + 2apx + start.
        x = (-(2 * d * p) - math.sqrt((2 * d * p) ** 2 + 4 * d * start)) / (-2 * d)
        return close(F(ans[1].split()[0]), round_sf(x, 3), F(1, 1000)), f"landing {x}"
    target = v["target"]
    w = math.sqrt(float((top - target) / a))
    pen = math.ceil((p - w) * 100) / 100
    nums = signed_nums(ans[1])
    return near(nums[0], p - w, 0.0051) and near(nums[-1], p + w, 0.0051) and near(F(ans[2].replace("£", "")), pen, 1e-9), f"{p - w} {p + w} {pen}"


def y12_factor_theorem(v, ans, level):
    co = v["coeffs"]
    r = v["r"]
    if poly_eval(co, r) != 0:
        return False, "r is not a root"
    # Synthetic division gives the quadratic, independently of how it was built.
    q2 = [co[0], co[1] + r * co[0], co[2] + r * (co[1] + r * co[0])]
    if level == "stretch":
        disc = q2[1] ** 2 - 4 * q2[0] * q2[2]
        return disc < 0 and signed_nums(ans[3])[-1] == round(math.log2(r)), f"disc {disc}"
    disc = q2[1] ** 2 - 4 * q2[0] * q2[2]
    root = math.isqrt(disc)
    if root * root != disc:
        return False, "the quadratic does not factorise"
    roots = sorted([F(-q2[1] + root, 2 * q2[0]), F(-q2[1] - root, 2 * q2[0]), F(r)])
    if level == "core":
        return sorted(signed_nums(ans[2])) == roots and signed_nums(ans[0])[0] == co[1], f"roots {roots}"
    return True, "roots"


def y12_binomial(v, ans, level):
    n, a, b = v["n"], v["a"], v["b"]
    if level == "foundational":
        co = [math.comb(n, r) * b ** r for r in range(4)]
        return signed_nums(ans[0]) == co[:3][0:1] + co[1:3] and signed_nums(ans[1])[0] == co[3], f"{co}"
    if level == "core":
        co = [math.comb(n, r) * a ** (n - r) * b ** r for r in range(3)]
        est = sum(F(co[r], 100 ** r) for r in range(3))
        return signed_nums(ans[0]) == co and near(signed_nums(ans[1])[0], est, 0.0051), f"{co} {float(est)}"
    k, c, d = v["k"], v["c"], v["d"]
    T = c * n * k + d
    # Recover k from the coefficient of x alone.
    found = F(T - d, c * n)
    x2 = c * math.comb(n, 2) * found ** 2 + d * n * found
    return signed_nums(ans[1])[-1] == found and signed_nums(ans[2])[0] == x2, f"k {found} x2 {x2}"


def y12_circle(v, ans, level):
    p, c, r2 = v["p"], v["q"], v["r2"]
    if level == "stretch":
        px, py, m = p + v["ux"], c + v["uy"], v["m"]
        k0 = py - m * px
        # Foot of the perpendicular from the centre to y = mx + k0.
        fx = F(p + m * (c - k0), m * m + 1)
        fy = m * fx + k0
        r = (fx - p) ** 2 + (fy - c) ** 2
        # Parallel tangents are equidistant from the centre.
        k = 2 * (c - m * p) - k0
        return (fx, fy) == (px, py) and r == r2 and signed_nums(ans[3])[-1] == k and signed_nums(ans[1]) == [px, py], f"P {fx},{fy} k {k}"
    r = math.isqrt(r2)
    if r * r != r2 or signed_nums(ans[0]) != [p, c, r]:
        return False, f"centre {p},{c} radius {r}"
    if level == "foundational":
        t = v["test"]
        d = (t[0] - p) ** 2 + (t[1] - c) ** 2
        return ("Inside" in ans[1]) == (d < r2), f"distance² {d}"
    px, py = p + v["ux"], c + v["uy"]
    m = re.search(r"(-?\d*)x\s*([+-])\s*(\d*)y(?:\s*([+-])\s*(\d+))?\s*=\s*0", ans[1].replace("$", ""))
    A = int(m.group(1) or 1) if m.group(1) != "-" else -1
    B = int(m.group(3) or 1) * (1 if m.group(2) == "+" else -1)
    C = (int(m.group(5)) * (1 if m.group(4) == "+" else -1)) if m.group(5) else 0
    onLine = A * px + B * py + C == 0
    # Tangent: distance from the centre equals the radius.
    dist2 = F((A * p + B * c + C) ** 2, A * A + B * B)
    return onLine and dist2 == r2, f"line {A},{B},{C}"


def y12_differentiation(v, ans, level):
    if level == "stretch":
        co = v["co"]
        d = [3 * co[0], 2 * co[1], co[2]]
        disc = d[1] ** 2 - 4 * d[0] * d[2]
        s = math.isqrt(disc)
        al, be = sorted([F(-d[1] - s, 2 * d[0]), F(-d[1] + s, 2 * d[0])])
        return signed_nums(ans[0]) == [al, poly_eval(co, al), be, poly_eval(co, be)] and signed_nums(ans[2]) == [al, be], f"{al} {be}"
    h = 1e-6
    if level == "core":
        f = lambda x: v["a"] * x * x + v["b"] / x + v["c"]
    else:
        f = lambda x: poly_eval(v["co"], x)
    p = v["p"]
    m = (f(p + h) - f(p - h)) / (2 * h)
    return near(signed_nums(ans[1])[0], m, 1e-3), f"gradient {m}"


def y12_first_principles(v, ans, level):
    h = F(1, 10 ** 9)
    if level == "foundational":
        p, b = v["p"], v["b"]
        g = lambda x: x * x + b * x
        return near((g(p + h) - g(p)) / h, signed_nums(ans[1])[-1], 1e-6), "chord"
    a = v["a"]
    if level == "core":
        f = lambda x: a * x * x + v["b"] * x + v["c"]
        return near((f(3 + h) - f(3)) / h, 2 * a * 3 + v["b"], 1e-6) and signed_nums(ans[0])[0] == 2 * a, "core limit"
    f = lambda x: a * x ** 3
    return near((f(3 + h) - f(3)) / h, 27 * a, 1e-6) and signed_nums(ans[0])[0] == 3 * a, "stretch limit"


def y12_integration(v, ans, level):
    if level == "foundational":
        a, b, p, y = v["a"], v["b"], v["p"], v["q"]
        c = y - a * p ** 3 - 2 * b * math.isqrt(p) ** 3
        want = ([a] if a != 1 else []) + [2 * b] + ([c] if c else [])
        return signed_nums(ans[1]) == want, f"c = {c}"
    if level == "core":
        al, be = v["alpha"], v["beta"]
        # Term by term from the expanded form, with exact fractions.
        F_ = lambda x: F(-x ** 3, 3) + F((al + be) * x * x, 2) - al * be * x
        return signed_nums(ans[1])[0] == F_(be) - F_(al), f"area {F_(be) - F_(al)}"
    k, m = v["k"], v["m"]
    d = k - m
    G = lambda x: F(k - m, 2) * x * x - F(x ** 3, 3)
    area = G(d) - G(0)
    return area == F(d ** 3, 6) and signed_nums(ans[2])[-1] == k, f"area {area}"


def y12_trig_equations(v, ans, level):
    shown = [float(x) for x in signed_nums(ans[-1])]
    if len(shown) != 2:
        return False, "two solutions expected"
    n, m, w = v.get("n"), v.get("m"), v.get("w")
    # Scan the whole interval for sign changes, without using inverse trig.
    if level == "foundational":
        s = float(q(v["s"]))
        fn = math.sin if v["fn"] == "sin" else math.cos
        g = lambda x: fn(math.radians(x + v["alpha"])) - s
        lo, hi = 0.0, 360.0
    elif level == "core":
        B, R = n * w + m, n + m * w
        g = lambda x: n * math.cos(math.radians(x)) ** 2 + B * math.sin(math.radians(x)) - R
        lo, hi = 0.0, 360.0
    else:
        s = F(m, n)
        g = lambda x: math.cos(math.radians(2 * x)) - float(s)
        lo, hi = 0.0, 180.0
    roots = []
    steps = 7200
    for i in range(steps):
        # The offset keeps the grid off exact roots such as 30°.
        a = lo + (hi - lo) * (i + 0.137) / steps
        b = lo + (hi - lo) * (i + 1.137) / steps
        if g(a) * g(b) < 0:
            for _ in range(60):
                c = (a + b) / 2
                if g(a) * g(c) <= 0:
                    b = c
                else:
                    a = c
            roots.append(a)
    return len(roots) == 2 and all(near(x, y, 0.051) for x, y in zip(shown, roots)), f"roots {roots}"


def y12_triangles(v, ans, level):
    if level == "foundational":
        a, b, c = v["a"], v["b"], v["c"]
        s = F(a + b + c, 2)
        area = math.sqrt(s * (s - a) * (s - b) * (s - c))
        angle = math.degrees(math.acos((a * a + b * b - c * c) / (2 * a * b)))
        return near(F(ans[1].split()[0]), area, max(area * 0.005, 0.06)) and near(signed_nums(ans[0])[0], angle, 0.051), f"area {area} angle {angle}"
    if level == "core":
        a, c, A = v["a"], v["c"], math.radians(v["angle"])
        # Solve for AC with the cosine rule: b² − 2bc cos A + c² − a² = 0; the shorter b has the obtuse angle at C.
        disc = (2 * c * math.cos(A)) ** 2 - 4 * (c * c - a * a)
        b = (2 * c * math.cos(A) - math.sqrt(disc)) / 2
        return near(F(ans[1].split()[0]), 0.5 * b * c * math.sin(A), max(0.5 * b * c * math.sin(A) * 0.005, 0.06)), f"b {b}"
    p, c, s = v["p"], v["q"], v["s"]
    # Search for x from the cosine rule directly.
    g = lambda x: (x + p) ** 2 + (x + c) ** 2 - (x + p) * (x + c) - (2 * x + s) ** 2
    lo = max(-p, -c, -s / 2) + 1e-9
    hi = lo + 1000
    if g(lo) * g(hi) > 0:
        return False, "no root in range"
    for _ in range(100):
        mid = (lo + hi) / 2
        if g(lo) * g(mid) <= 0:
            hi = mid
        else:
            lo = mid
    area = 0.5 * (lo + p) * (lo + c) * math.sin(math.radians(60))
    return near(F(ans[1].split()[0]), area, max(area * 0.005, 0.06)), f"x {lo} area {area}"


def y12_exponential_model(v, ans, level):
    if level == "foundational":
        A, B, k, t1, T = v["A"], v["B"], float(q(v["k"])), v["t1"], v["target"]
        return (
            signed_nums(ans[0])[0] == A + B
            and near(signed_nums(ans[1])[0], B + A * math.exp(-k * t1), max(0.06, 0.005 * A))
            and near(signed_nums(ans[2])[0], math.log(A / (T - B)) / k, 0.051)
        ), "cooling"
    if level == "core":
        A, t1, y1, t2, T = v["A"], v["t1"], v["y1"], v["t2"], v["target"]
        k = math.log(y1 / A) / t1
        N = A * (y1 / A) ** (t2 / t1)
        w = 1
        while A * (y1 / A) ** (w / t1) <= T:
            w += 1
        return near(signed_nums(ans[2])[0], N, 0.51) and signed_nums(ans[3])[0] == w and near(signed_nums(ans[1])[-1], k, max(0.0006, k * 0.005)), f"k {k} N {N} w {w}"
    c, m, T = float(q(v["c"])), float(q(v["m"])), v["target"]
    a, b = 10 ** c, 10 ** m
    t = (math.log(T) - math.log(a)) / math.log(b)
    nums = signed_nums(ans[1])
    return near(nums[0], a, a * 0.006) and near(nums[1], b, b * 0.006) and near(signed_nums(ans[3])[0], t, 0.51), f"a {a} b {b} t {t}"


def y12_logs(v, ans, level):
    b = v["base"]
    if level == "foundational":
        w = math.log(v["x"]) / math.log(b)
        return near(signed_nums(ans[2])[-1], w, max(0.006, w * 0.005)), f"w {w}"
    if level == "core":
        d, n = v["d"], v["n"]
        disc = d * d + 4 * b ** n
        s = math.isqrt(disc)
        if s * s != disc:
            return False, "no whole root"
        x = F(-d + s, 2)
        return signed_nums(ans[0])[0] == x and math.log(x, b) + math.log(x + d, b) - n < 1e-9, f"x {x}"
    p, c = v["p"], v["q"]
    S, P = p - c, p * c
    disc = S * S + 4 * P
    y = (S + math.sqrt(disc)) / 2
    x = math.log(y) / math.log(b)
    return near(signed_nums(ans[1])[0], x, max(0.006, x * 0.005)), f"x {x}"


def y12_vectors(v, ans, level):
    a = v["a"]
    if level == "foundational":
        ang = math.degrees(math.atan2(abs(a[1]), abs(a[0])))
        return near(signed_nums(ans[1])[0], ang, 0.051) and signed_nums(ans[2]) == [3 * a[0], 3 * a[1]], f"angle {ang}"
    if level == "core":
        b, c = v["b"], v["c"]
        ab = [b[0] - a[0], b[1] - a[1]]
        d = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]]
        n2 = ab[0] ** 2 + ab[1] ** 2
        shown = ans[1].replace("$", "")
        m = re.fullmatch(r"(\d*)(?:\\sqrt\{(\d+)\})?", shown)
        length2 = int(m.group(1) or 1) ** 2 * int(m.group(2) or 1)
        comp = {}
        for sign, num, unit in re.findall(r"([+-]?)\s*(\d*)\\mathbf\{([ij])\}", ans[2].replace("$", "")):
            comp[unit] = int(num or 1) * (-1 if sign == "-" else 1)
        return length2 == n2 and [comp.get("i", 0), comp.get("j", 0)] == d, f"{ab} {d}"
    b, dr = v["b"], v["dir"]
    # Cross-multiplying (a0 + lb0)·d1 = (a1 + lb1)·d0.
    lam = F(a[1] * dr[0] - a[0] * dr[1], b[0] * dr[1] - b[1] * dr[0])
    r = [a[0] + lam * b[0], a[1] + lam * b[1]]
    size = math.sqrt(r[0] ** 2 + r[1] ** 2)
    return signed_nums(ans[0])[-1] == lam and near(signed_nums(ans[1])[0], size, max(0.006, size * 0.005)), f"lambda {lam} {size}"


def y12_proof(v, ans, level):
    if level == "foundational":
        p = v["p"]
        n = signed_nums(ans[0])
        t = n[0] * n[0] + n[0] + p
        return t == n[1] and t % p == 0, f"{t}"
    if level == "core":
        h, c = v["h"], v["c"]
        best = min(F(i, 2) ** 2 + 2 * h * F(i, 2) + c for i in range(-100, 101))
        return best == signed_nums(ans[1])[0] and best > 0, f"min {best}"
    return all((n * n + v["a"] * n + v["c"]) % 2 == 1 for n in range(-50, 51)), "parity"


# ---------------------------------------------------------------- A-level: Year 13 Pure


def tofloat(x):
    return float(F(x))


def simpson(f, a, b, n=2000):
    s = f(a) + f(b)
    for i in range(1, n):
        s += f(a + (b - a) * i / n) * (4 if i % 2 else 2)
    return s * (b - a) / (3 * n)


def ascending_coeffs(text):
    """Coefficients of a + bx + cx², reading a missing number in front of x as 1."""
    t = text.replace("$", "").replace(" ", "")
    out = {}
    for sign, num, den, whole, power in re.findall(r"([+-]?)(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))?(x(?:\^\{?\d\}?)?)?", t):
        if not (num or whole or power):
            continue
        c = F(int(num), int(den)) if num else F(int(whole)) if whole else F(1)
        p = 0 if not power else 1 if power == "x" else int(re.search(r"\d", power).group())
        out[p] = -c if sign == "-" else c
    return [out.get(i, F(0)) for i in range(max(out) + 1)]


def y13_series(v, ans, level):
    if level == "foundational":
        a, d, n, S = v["a"], v["d"], v["n"], v["S"]
        terms_ = [a + i * d for i in range(n)]
        m, total = 0, 0
        while total < S:
            total += a + m * d
            m += 1
        grp = lambda t: F(t.replace(" ", "").replace(" ", ""))
        return grp(ans[0]) == terms_[-1] and grp(ans[1]) == sum(terms_) and signed_nums(ans[2])[0] == m and total == S, f"{terms_[-1]} {sum(terms_)} {m}"
    if level == "core":
        start, r, yrs, T = v["start"], 1 + v["pct"] / 100, v["years"], v["target"]
        y, p = 1, start
        while p <= T:
            p *= r
            y += 1
        total = sum(start * r ** i for i in range(yrs))
        shown = F(ans[2].replace("£", "").replace(" ", "").replace(" ", ""))
        return signed_nums(ans[1])[0] == y and near(shown, total, total * 0.006), f"year {y} total {total}"
    co, k = v["co"], v["k"]
    t = [a * k + b for a, b in co]
    if t[1] * t[1] != t[0] * t[2]:
        return False, f"terms {t}"
    r = F(t[1], t[0])
    return abs(r) < 1 and signed_nums(ans[1])[0] == t[0] / (1 - r), f"sum {t[0] / (1 - r)}"


def y13_general_binomial(v, ans, level):
    n, a, b = q(v["n"]), v["a"], v["b"]
    if level == "stretch":
        c, d = v["c"], v["d"]
        c1 = n * b
        c2 = n * (n - 1) / 2 * b * b
        return signed_nums(ans[1])[0] == c * c2 + d * c1, f"{c * c2 + d * c1}"
    # Taylor coefficients by numerical differentiation of the original.
    f = lambda x: (a + b * x) ** float(n)
    h = 1e-4
    c0, c1, c2 = f(0), (f(h) - f(-h)) / (2 * h), (f(h) - 2 * f(0) + f(-h)) / (2 * h * h)
    # Read the coefficients in order: a leading 1 is hidden only in a coefficient of x.
    shown = ascending_coeffs(ans[0])
    want = [c0, c1, c2]
    if len(shown) != 3 or not all(near(x, y, 1e-3 * max(1, abs(y))) for x, y in zip(shown, want)):
        return False, f"{want} vs {shown}"
    limit = signed_nums(ans[1])[0]
    if limit != F(a, abs(b)):
        return False, f"limit {limit}"
    if level == "core":
        est = c0 + c1 / 10 + c2 / 100
        return near(signed_nums(ans[2])[0], est, 0.00006), f"estimate {est}"
    return True, "series"


def y13_partial_fractions(v, ans, level):
    A, B, r, s, lo, hi = v["A"], v["B"], v["r"], v["s"], v["lo"], v["hi"]
    C = v["C"]
    if level == "stretch":
        n = lambda x: (A + C) * x * x + (-A * (r + s) + B - 2 * C * r) * x + (A * r * s - B * s + C * r * r)
        # Cover-up rule, from the numerator only.
        B2 = F(n(r), r - s)
        C2 = F(n(s), (s - r) ** 2)
        lead = F(A + C) - C2
        if (B2, C2, lead) != (B, C, A):
            return False, f"{lead} {B2} {C2}"
        f = lambda x: n(x) / ((x - r) ** 2 * (x - s))
        exact = A * math.log((hi - r) / (lo - r)) + C * math.log((hi - s) / (lo - s)) + F(B, lo - r) - F(B, hi - r)
        return near(simpson(f, lo, hi), exact, 1e-6), f"{exact}"
    n = lambda x: (A + B) * x - A * s - B * r
    if F(n(r), r - s) != A or F(n(s), s - r) != B:
        return False, "cover-up"
    if level == "foundational":
        return signed_nums(ans[0]) == [A, B], "A, B"
    f = lambda x: n(x) / ((x - r) * (x - s))
    return near(simpson(f, lo, hi), A * math.log((hi - r) / (lo - r)) + B * math.log((hi - s) / (lo - s)), 1e-6), "integral"


def y13_functions(v, ans, level):
    if level == "foundational":
        a, b, c, d, e = v["a"], v["b"], v["c"], v["d"], v["e"]
        return signed_nums(ans[0])[0] == a * F(c, e + d) + b and signed_nums(ans[2])[-1] == F(c, d), "fg, range"
    if level == "core":
        a, p, c, k, m = v["a"], v["p"], v["q"], v["k"], v["m"]
        nums = signed_nums(ans[1])
        w = F(m - c, a)
        if sorted(nums) != sorted([p - w, p + w]):
            return False, f"modulus {nums}"
        lim = signed_nums(ans[2])
        low = F(c - k, p)

        def count(g):
            f = lambda x: a * abs(x - p) + c - (g * x + k)
            return sum(1 for i in range(-40000, 40000) if f((i + 0.137) / 20) * f((i + 1.137) / 20) < 0)

        return lim[0] == low and lim[-1] == a and count((float(low) + a) / 2) == 2 and count(float(low) - 0.1) != 2 and count(a + 0.3) != 2, f"range {low} {a}"
    h, c = v["h"], v["q"]
    # f(x) = x, from the expanded quadratic.
    B, C = 2 * h - 1, h * h + c
    disc = B * B - 4 * C
    root = math.isqrt(disc)
    roots = [F(-B + root, 2), F(-B - root, 2)]
    valid = [x for x in roots if x >= -h]
    return root * root == disc and valid == [signed_nums(ans[2])[0]], f"roots {roots}"


def y13_differentiation(v, ans, level):
    d = lambda f, x: (f(x + 1e-6) - f(x - 1e-6)) / 2e-6
    if level == "foundational":
        a, b, n, k, p = v["a"], v["b"], v["n"], v["k"], v["p"]
        f = lambda x: (a * x + b) ** n
        shown = lambda x: n * a * (a * x + b) ** (n - 1)
        g = lambda x: x ** p * math.exp(k * x)
        form = lambda x: x ** (p - 1) * math.exp(k * x) * (k * x + p)
        return near(d(f, 1.2), shown(1.2), 1e-2 * max(1, abs(shown(1.2)))) and near(d(g, 0.7), form(0.7), 1e-3 * max(1, form(0.7))), "rules"
    if level == "core":
        dd, c, s = v["d"], v["c"], v["s"]
        f = lambda x: (x * x + c) / (x + dd)
        nums = signed_nums(ans[1])
        lo, hi = nums[0], nums[-1]
        return near(d(f, float(lo)), 0, 1e-3) and near(d(f, float(hi)), 0, 1e-3) and d(f, float(lo) - 0.5) > 0 and d(f, float(lo) + 0.1) < 0 and nums[1] == -dd, f"{lo} {hi}"
    b, c, al, be = v["b"], v["c"], v["alpha"], v["beta"]
    f = lambda x: (x * x + b * x + c) * math.exp(x)
    nums = signed_nums(ans[0])
    return nums == [b + 2, b + c] and near(d(f, al), 0, 1e-3 * max(1, abs(f(al)))) and near(d(f, be), 0, 1e-3 * max(1, abs(f(be)))), "stationary"


def y13_implicit_parametric(v, ans, level):
    if level == "stretch":
        a, t = v["a"], v["t"]
        px, py = a * t * t, 2 * a * t
        # Normal gradient −t: substitute y = 2aT, x = aT² and solve the quadratic in T.
        A, B, C = t * a, 2 * a, -(t * px + py)
        disc = B * B - 4 * A * C
        s = math.isqrt(disc)
        roots = [F(-B + s, 2 * A), F(-B - s, 2 * A)]
        other = [r for r in roots if r != t]
        T = other[0]
        return s * s == disc and signed_nums(ans[2]) == [a * T * T, 2 * a * T], f"T {T}"
    a, b, k, px, py = v["a"], v["b"], v["k"], v["px"], v["py"]
    if px * px + a * px * py + b * py * py != k:
        return False, "P is not on the curve"
    if level == "core":
        # Scan the curve for horizontal tangents using the upper or lower branch.
        return (b - 1) * px * px == k and py == -px and signed_nums(ans[1]) == [px, py, -px, -py], "points"
    # Numeric gradient from solving the quadratic in y.
    def y(x):
        d = math.sqrt((a * x) ** 2 - 4 * b * (x * x - k))
        r1, r2 = (-a * x + d) / (2 * b), (-a * x - d) / (2 * b)
        return r1 if abs(r1 - py) < abs(r2 - py) else r2

    g = (y(px + 1e-5) - y(px - 1e-5)) / 2e-5
    m = re.search(r"(-?\d*)x\s*([+-])\s*(\d*)y(?:\s*([+-])\s*(\d+))?\s*=\s*0", ans[1].replace("$", ""))
    A = -1 if m.group(1) == "-" else int(m.group(1) or 1)
    B = int(m.group(3) or 1) * (1 if m.group(2) == "+" else -1)
    C = (int(m.group(5)) * (1 if m.group(4) == "+" else -1)) if m.group(5) else 0
    return A * px + B * py + C == 0 and near(-A / B, g, 1e-3), f"line {A},{B},{C} gradient {g}"


def y13_integration(v, ans, level):
    if level == "foundational":
        a, k = v["a"], v["k"]
        nums = signed_nums(ans[0])
        F_ = lambda x: float(nums[0]) * x * math.exp(k * x) + float(nums[1]) * math.exp(k * x)
        return near((F_(0.4 + 1e-6) - F_(0.4 - 1e-6)) / 2e-6, a * 0.4 * math.exp(k * 0.4), 1e-3), "derivative"
    if level == "core":
        a, n = v["a"], v["n"]
        nums = signed_nums(ans[0])
        # Coefficient of ln a, then the base of the log, then the fraction.
        c1, base, c2 = nums[0], nums[1], nums[2]
        return base == a and near(float(c1) * math.log(a) + float(c2), simpson(lambda x: x ** n * math.log(x), 1, a), 1e-6), "by parts"
    c, m = v["c"], v["m"]
    return near(signed_nums(ans[0])[0], simpson(lambda x: x * math.sqrt(x * x + c), 0, m), 1e-6), "substitution"


def y13_r_form(v, ans, level):
    a, b = v["a"], v["b"]
    # Find the maximum by scanning, without tan or the Pythagorean R.
    g = lambda x: a * math.sin(math.radians(x)) + b * math.cos(math.radians(x))
    best = max(range(0, 36000), key=lambda i: g(i / 100)) / 100
    if level == "stretch":
        t = best / v["rate"]
        nums = signed_nums(ans[1])
        return near(nums[-1], t, 0.006) and near(nums[0], v["mean"] + math.hypot(a, b), 0.006), f"t {t}"
    alpha = 90 - best
    shown = re.search(r"([\d.]+)\^\\circ", ans[0]).group(1)
    if not near(F(shown), alpha, 0.02):
        return False, f"alpha {alpha}"
    if level == "foundational":
        return near(signed_nums(ans[1])[-1], best, 0.02), f"x {best}"
    roots = []
    m = v["m"]
    for i in range(36000):
        x, y = (i + 0.137) / 100, (i + 1.137) / 100
        if (g(x) - m) * (g(y) - m) < 0:
            roots.append(x)
    return len(roots) == 2 and all(near(p, r, 0.06) for p, r in zip(signed_nums(ans[1]), roots)), f"{roots}"


def y13_numerical(v, ans, level):
    lo = float(q(v["lo"]))
    hi = float(q(v["lo"]) + F(1, 10))
    if level == "foundational":
        a, b = v["a"], v["b"]
        f = lambda x: x ** 3 + a * x - b
        x2 = (b - a * float(q(v["x0"]))) ** (1 / 3)
        x3 = (b - a * x2) ** (1 / 3)
        nums = signed_nums(ans[2].replace("x_2", "").replace("x_3", ""))
        return f(lo) < 0 < f(hi) and near(nums[0], x2, 0.00051) and near(nums[1], x3, 0.00051), f"{x2} {x3}"
    if level == "core":
        a, b = v["a"], v["b"]
        f = lambda x: a * math.log(x) + x * x - b
        fp = lambda x: (f(x + 1e-7) - f(x - 1e-7)) / 2e-7
    else:
        p, c = v["p"], v["c"]
        f = lambda x: x ** 3 - 3 * p * p * x + c
        fp = lambda x: (f(x + 1e-7) - f(x - 1e-7)) / 2e-7
        if abs(fp(p)) > 1e-4:
            return False, "not stationary"
    step_ = hi - f(hi) / fp(hi)
    shown = signed_nums(ans[2] if level == "core" else ans[1])[0]
    return f(lo) < 0 < f(hi) and near(shown, step_, 0.00051), f"{step_}"


def y13_differential_equations(v, ans, level):
    if level == "foundational":
        a, y0, x1 = v["a"], v["y0"], v["x1"]
        # Euler with a fine step, straight from the equation.
        x, y, n = 0.0, float(y0), 100000
        for _ in range(n):
            y += a * x * y * (x1 / n)
            x += x1 / n
        return near(signed_nums(ans[1])[0], y, y * 0.01), f"{y}"
    if level == "core":
        Ta, T0, t1, T1, T = v["Ta"], v["T0"], v["t1"], v["T1"], v["target"]
        k = math.log((T0 - Ta) / (T1 - Ta)) / t1
        t = t1 * math.log((T0 - Ta) / (T - Ta)) / math.log((T0 - Ta) / (T1 - Ta))
        return near(signed_nums(ans[2])[-1], k, max(0.0006, k * 0.006)) and near(signed_nums(ans[3])[0], t, 0.51), f"k {k} t {t}"
    p, c, H0, H1 = q(v["p"]), q(v["q"]), q(v["H0"]), q(v["H1"])
    A, B = H0 - p / c, p / c
    t = math.log(float(B) / float(H1 - A)) / float(c)
    nums = signed_nums(ans[1])
    mins = sum(int(x) * (60 if "hour" in w else 1) for x, w in re.findall(r"(\d+) (hour|minute)", ans[1]))
    return signed_nums(ans[0]) == [A, B] and abs(mins - t * 60) <= 0.51 and signed_nums(ans[2])[0] == A, f"t {t * 60} {nums}"


def y13_radians(v, ans, level):
    r, th = v["r"], q(v["theta"])
    if level == "foundational":
        return F(ans[0].split()[0]) == r * th and F(ans[1].split()[0]) == F(r * r, 2) * th and F(ans[2].split()[0]) == r * th + 2 * r, "sector"
    if level == "core":
        t = float(th)
        # Segment area by integration across the chord.
        d = r * math.cos(t / 2)
        seg = simpson(lambda x: 2 * math.sqrt(max(r * r - x * x, 0)), d, r, 20000)
        tri = 0.5 * r * r * math.sin(t)
        return near(F(ans[0].split()[0]), tri, max(0.06, tri * 0.006)) and near(F(ans[1].split()[0]), seg, max(0.06, seg * 0.006)), f"{tri} {seg}"
    P, A = q(v["P"]), q(v["A"])
    disc = P * P - 16 * A
    # Keep only roots with 0 < θ < 2π, as the question says.
    root = F(math.isqrt(disc.numerator), math.isqrt(disc.denominator))
    if root * root != disc:
        return False, "irrational roots"
    rs = [(P + root) / 4, (P - root) / 4]
    good = [x for x in rs if x > 0 and 0 < float((P - 2 * x) / x) < 2 * math.pi]
    nums = signed_nums(ans[1])
    return len(good) == 1 and nums == [good[0], (P - 2 * good[0]) / good[0]], f"{good}"


def y13_proof(v, ans, level):
    if level == "foundational":
        k = v["k"]
        return k % 4 == 2 and not any(a * a - b * b == k for a in range(k + 3) for b in range(a + 1)), f"{k}"
    if level == "core":
        p = v["p"]
        return all(a * a != p * b * b for b in range(1, 400) for a in range(int(b * p ** 0.5), int(b * p ** 0.5) + 2)), f"{p}"
    p, c = v["p"], v["q"]
    return p != c and all(p ** a != c ** b for a in range(1, 30) for b in range(1, 30)), f"{p} {c}"


def y13_vectors(v, ans, level):
    a = v["a"]
    if level == "foundational":
        m = math.sqrt(sum(x * x for x in a))
        return near(signed_nums(ans[1])[0], math.degrees(math.acos(a[0] / m)), 0.051), f"{m}"
    b, c = v["b"], v["c"]
    if level == "core":
        ab = [y - x for x, y in zip(a, b)]
        ac = [y - x for x, y in zip(a, c)]
        dot = sum(x * y for x, y in zip(ab, ac))
        ang = math.degrees(math.acos(dot / math.sqrt(sum(x * x for x in ab) * sum(x * x for x in ac))))
        return near(signed_nums(ans[1])[0], ang, 0.051), f"{ang}"
    d = [y - x for x, y in zip(a, b)]
    lam = F(c[0] - a[0], d[0])
    p = a[1] + lam * d[1]
    r = a[2] + lam * d[2]
    return signed_nums(ans[1]) == [p, r], f"{p} {r}"


# ---------------------------------------------------------------- A-level: further Pure


def frac_or_num(text):
    return signed_nums(text)


def y12_straight_lines(v, ans, level):
    if level == "stretch":
        p, c, m = v["r"][0], v["r"][1], v["m"]
        c1 = c - m * p
        c2 = c + F(p, m)
        # Shoelace on (0, c1), (0, c2), (p, c).
        area = abs(F(0 * (c2 - c) + 0 * (c - c1) + p * (c1 - c2), 2))
        return signed_nums(ans[1]) == [p, c] and signed_nums(ans[2])[0] == area, f"area {area}"
    a, b = v["a"], v["b"]
    dx, dy = b[0] - a[0], b[1] - a[1]
    mx, my = F(a[0] + b[0], 2), F(a[1] + b[1], 2)
    if level == "foundational":
        return signed_nums(ans[0])[0] == F(dy, dx) and signed_nums(ans[2]) == [mx, my], "gradient, midpoint"
    # C on the x-axis, the same distance from A and B.
    x = F(b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2, 2 * dx)
    return signed_nums(ans[1])[0] == x, f"C at {x}"


def scan_roots(g, lo, hi, steps=7200):
    roots = []
    for i in range(steps):
        a = lo + (hi - lo) * (i + 0.137) / steps
        b = lo + (hi - lo) * (i + 1.137) / steps
        if g(a) * g(b) < 0 and abs(g(a)) < 50:
            for _ in range(60):
                c = (a + b) / 2
                if g(a) * g(c) <= 0:
                    b = c
                else:
                    a = c
            roots.append(a)
    return roots


def y13_double_angle(v, ans, level):
    if level == "foundational":
        o, h = v["opp"], v["hyp"]
        A = math.asin(o / h)
        got = [float(signed_nums(x)[0]) for x in ans]
        return all(near(g, w, 1e-9) for g, w in zip(got, [math.sin(2 * A), math.cos(2 * A), math.tan(2 * A)])), f"{got}"
    shown = [float(x) for x in signed_nums(ans[1])]
    if level == "core":
        a, b, c = v["a"], v["b"], v["c"]
        roots = scan_roots(lambda x: a * math.cos(math.radians(2 * x)) + b * math.sin(math.radians(x)) + c, 0, 360)
    else:
        t1 = v["t1"]
        k = t1 * t1 - t1 + 1
        g = lambda x: (1 - math.cos(math.radians(2 * x))) / math.sin(math.radians(2 * x)) - (1 / math.cos(math.radians(x)) ** 2 - k)
        roots = scan_roots(g, 0.01, 89.99) + scan_roots(g, 90.01, 179.99)
    return len(roots) == 2 and all(near(s, r, 0.051) for s, r in zip(shown, roots)), f"{roots}"


def y13_trapezium(v, ans, level):
    lo, h, n, c = v["lo"], float(q(v["h"])), v["strips"], v["c"]
    f = (lambda x: math.sqrt(x ** 3 + c)) if level == "foundational" else (lambda x: x * math.log(x))
    ys = [round(f(lo + i * h) + 0.0, 4) for i in range(n + 1)]
    est = h / 2 * (ys[0] + ys[-1] + 2 * sum(ys[1:-1]))
    if not near(F(ans[0]), f(lo + v["gap"] * h), 0.00006) or not near(F(ans[1]), est, max(est * 0.006, 0.006)):
        return False, f"estimate {est}"
    b = lo + n * h
    if level == "core":
        true = simpson(f, lo, b)
        pct = abs(est - true) / true * 100
        return near(F(ans[2].replace("%", "")), pct, max(pct * 0.1, 0.001)), f"{pct}%"
    if level == "stretch":
        val = v["add"] * n * h + 2 * est
        return near(F(ans[3]), val, val * 0.01) and est > simpson(f, lo, b), f"{val}"
    return True, "estimate"


def y13_connected_rates(v, ans, level):
    r, x = v["rate"], v["x"]
    dt = 1e-5
    if level == "foundational":
        V = lambda t: (x + r * t) ** 3
        A = lambda t: 6 * (x + r * t) ** 2
        return near(signed_nums(ans[0])[0], (V(dt) - V(-dt)) / (2 * dt), 1e-2) and near(signed_nums(ans[1].split("cm")[0])[0], (A(dt) - A(-dt)) / (2 * dt), 1e-2), "rates"
    if level == "core":
        inv = lambda vol: (3 * vol / (4 * math.pi)) ** (1 / 3)
        V0 = 4 / 3 * math.pi * x ** 3
    else:
        p, c = v["p"], v["q"]
        k = math.pi * p * p / (3 * c * c)
        inv = lambda vol: (vol / k) ** (1 / 3)
        V0 = k * x ** 3
    rate = (inv(V0 + r * dt) - inv(V0 - r * dt)) / (2 * dt)
    return near(F(ans[-1].split()[0]), rate, rate * 0.006), f"{rate}"


def y13_small_angles(v, ans, level):
    t = 1e-3
    a, b, c, d = v["a"], v["b"], v["c"], v["d"]
    if level == "foundational":
        co = ascending_coeffs(ans[0].replace("\\theta", "x"))
        return near(co[0], a, 1e-9) and near(co[1], c * d, 1e-9) and near(co[2], -a * b * b / 2, 1e-9), f"{co}"
    if level == "core":
        val = (1 - math.cos(b * t)) / (t * math.tan(c * t))
        return near(signed_nums(ans[0])[-1], val, 1e-3), f"{val}"
    r = math.radians(v["deg"])
    approx, true = 1 - (b * r) ** 2 / 2, math.cos(b * r)
    pct = abs(approx - true) / true * 100
    return near(F(ans[2].replace("%", "")), pct, max(pct * 0.06, 1e-5)), f"{pct}"


# ---------------------------------------------------------------- A-level: Year 12 Mechanics


def y12_speed_time(v, ans, level):
    V, t1, t2, t3 = v["V"], v["t1"], v["t2"], v["t3"]
    area = F(V * t1, 2) + V * t2 + F(V * t3, 2)
    T = t1 + t2 + t3
    if level == "foundational":
        return signed_nums(ans[0])[0] == F(V, t1) and F(ans[1].split()[0]) == area, f"{area}"
    if level == "core":
        # T from the area of a trapezium with parallel sides T and T − t1 − t3.
        got = (2 * area / V + t1 + t3) / 2
        return signed_nums(ans[0])[0] == got == T and signed_nums(ans[1])[0] == F(V, t3), f"T {got}"
    half = area / 2
    t = t1 + (half - F(V * t1, 2)) / V
    return signed_nums(ans[0])[0] == V and signed_nums(ans[2])[0] == t, f"t {t}"


def y12_suvat(v, ans, level):
    u, a = q(v["u"]), q(v["a"])
    if level == "foundational":
        t, T = v["t"], q(v["target"])
        return F(ans[0].split()[0]) == u + a * t and F(ans[1].split()[0]) == u * t + a * t * t / 2 and F(ans[2].split()[0]) == (T - u) / a, "suvat"
    if level == "core":
        U, h, g = float(u), v["h"], 9.8
        # Roots of h + Ut − 4.9t² = 0.
        t = (-U - math.sqrt(U * U + 4 * 4.9 * h)) / (-2 * 4.9)
        vel = abs(U - g * t)
        top = h + U * U / (2 * g)
        got = [float(F(x.split()[0])) for x in ans]
        return near(got[0], top, top * 0.006) and near(got[1], t, t * 0.006) and near(got[2], vel, vel * 0.006), f"{top} {t} {vel}"
    t = v["t"]
    AB = u * t + a * t * t / 2
    BC = AB + a * t * t
    # From the two distances only.
    acc = (BC - AB) / (t * t)
    u0 = AB / t - acc * t / 2
    nums = signed_nums(ans[0].replace("s$^{-2}$", "").replace("s$^{-1}$", ""))
    return nums[0] == acc and nums[-1] == u0 and F(ans[1].split()[0]) == u0 + 2 * acc * t, f"a {acc} u {u0}"


def ij_parts(text):
    out = {}
    t = text.replace("$", "").replace(" ", "")
    for sign, num, unit in re.findall(r"([+-]?)(\d*\.?\d*)\\mathbf\{([ij])\}", t):
        out[unit] = F(num or 1) * (-1 if sign == "-" else 1)
    return out.get("i", F(0)), out.get("j", F(0))


def y12_forces_vectors(v, ans, level):
    f1, f2, m = v["f1"], v["f2"], q(v["m"])
    r = (f1[0] + f2[0], f1[1] + f2[1])
    size = math.hypot(r[0], r[1]) / float(m)
    if level == "foundational":
        return ij_parts(ans[0]) == r and near(F(ans[1].split()[0]), size, size * 0.006) and ij_parts(ans[2]) == (-r[0], -r[1]), f"{size}"
    if level == "core":
        u, t = v["u"], v["t"]
        acc = (r[0] / m, r[1] / m)
        vel = (u[0] + acc[0] * t, u[1] + acc[1] * t)
        sp = math.hypot(vel[0], vel[1])
        ang = math.degrees(math.atan2(abs(r[1]), abs(r[0])))
        return ij_parts(ans[0]) == acc and ij_parts(ans[1]) == vel and near(F(ans[2].split()[0]), sp, sp * 0.006) and near(signed_nums(ans[3])[0], ang, 0.051), f"{sp} {ang}"
    d = v["dir"]
    # (f1x + p)/(f1y + f2y) = dx/dy
    p = F(d[0] * (f1[1] + f2[1]), d[1]) - f1[0]
    R = (f1[0] + p, f1[1] + f2[1])
    a = math.hypot(R[0], R[1]) / float(m)
    return signed_nums(ans[0])[0] == p and near(F(ans[1].split()[0]), a, a * 0.006), f"p {p} a {a}"


def y12_connected(v, ans, level):
    m1, m2 = v["m1"], v["m2"]
    if level == "foundational":
        D, r1, r2 = v["D"], v["r1"], v["r2"]
        a = F(D - r1 - r2, m1 + m2)
        # Tension from the car's equation.
        T = D - r1 - m1 * a
        return F(ans[0].split()[0]) == a and F(ans[1].split()[0].replace(" ", "")) == T, f"{a} {T}"
    g, h = 9.8, float(q(v["h"]))
    if level == "core":
        # Energy for the speed; then a from v² = 2ah.
        sp = math.sqrt(2 * m2 * g * h / (m1 + m2))
        a = sp * sp / (2 * h)
        T = m2 * (g - a)
        k = float(q(v["d"]) - q(v["h"])) / sp
        nums = signed_nums(ans[1].replace("s$^{-2}$", ""))
        return near(nums[0], a, a * 0.006) and near(nums[-1], T, T * 0.006) and near(F(ans[2].split()[0]), sp, sp * 0.006) and near(F(ans[3].split()[0]), k, k * 0.006), f"{a} {T} {sp} {k}"
    sp = math.sqrt(2 * (m1 - m2) * g * h / (m1 + m2))
    a = sp * sp / (2 * h)
    T = m1 * (g - a)
    top = 2 * h + sp * sp / (2 * g)
    nums = signed_nums(ans[0].replace("s$^{-2}$", ""))
    return near(nums[0], a, a * 0.006) and near(nums[-1], T, T * 0.006) and near(F(ans[2].split()[0]), top, top * 0.006), f"{a} {T} {top}"


def y12_variable_acceleration(v, ans, level):
    a, p, c, r, s0 = v["a"], v["p"], v["q"], v["r"], v["s0"]
    co = [a, F(-3 * a * (p + c), 2), 3 * a * p * c, s0]
    vel = lambda t: 3 * co[0] * t * t + 2 * co[1] * t + co[2]
    s = lambda t: poly_eval(co, t)
    if level == "foundational":
        return signed_nums(ans[2])[0] == vel(r), "velocity"
    if level == "core":
        rests = [t for t in range(0, r + 1) if vel(t) == 0]
        pts = [0] + rests + [r]
        tot = sum(abs(s(y) - s(x)) for x, y in zip(pts, pts[1:]))
        return rests == [p, c] and signed_nums(ans[0]) == [p, c] and signed_nums(ans[1])[0] == tot, f"{rests} {tot}"
    best = max(abs(vel(p + (c - p) * F(i, 2000))) for i in range(2001))
    return signed_nums(ans[1])[0] == best and signed_nums(ans[2])[0] == s(r), f"{best} {s(r)}"


# ---------------------------------------------------------------- A-level: Year 12 Statistics


def bpmf(n, p, k):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k) if 0 <= k <= n else 0.0


def bcdf(n, p, k):
    return sum(bpmf(n, p, i) for i in range(0, min(k, n) + 1))


def y12_binomial_distribution(v, ans, level):
    n, p, k = v["n"], float(q(v["p"])), v["k"]
    close3 = lambda s, w: near(F(s), w, max(abs(w) * 0.006, 1e-5))
    if level == "foundational":
        return close3(ans[0], bpmf(n, p, k)) and close3(ans[1], bcdf(n, p, k)) and close3(ans[2], bcdf(n, p, k) - bcdf(n, p, v["low"])), "probabilities"
    if level == "core":
        return close3(ans[1], bpmf(n, p, k)) and close3(ans[2], bpmf(v["m"], bcdf(n, p, k), v["j"])), "second binomial"
    # Solve for p from the table.
    pr = (1 - q(v["c"])) / (1 + v["mult"])
    a = 0
    while bcdf(n, float(pr), a) <= 0.9:
        a += 1
    return pr == q(v["p"]) and close3(ans[1], bcdf(n, p, k) - bcdf(n, p, v["low"])) and signed_nums(ans[2])[-1] == a, f"p {pr} a {a}"


def y12_hypothesis_test(v, ans, level):
    n, p, x, alpha = v["n"], float(q(v["p"])), v["x"], v["alpha"]
    if level == "stretch":
        t = alpha / 200
        lo = max((k for k in range(n + 1) if bcdf(n, p, k) <= t), default=-1)
        hi = min((k for k in range(n + 1) if 1 - bcdf(n, p, k - 1) <= t), default=n + 1)
        actual = bcdf(n, p, lo) + (1 - bcdf(n, p, hi - 1))
        inside = x <= lo or x >= hi
        nums = signed_nums(ans[1])
        return nums == [lo, hi] and near(F(ans[2]), actual, max(actual * 0.006, 1e-5)) and (("In the critical" in ans[3]) == inside), f"{lo} {hi} {actual}"
    pv = 1 - bcdf(n, p, x - 1) if v["up"] else bcdf(n, p, x)
    text = ans[1] if level == "foundational" else ans[0]
    verdict = ans[2] if level == "foundational" else ans[0]
    shown = F(text) if level == "foundational" else F(re.search(r"value (\d*\.?\d+)", text).group(1))
    reject = pv < alpha / 100
    return near(shown, pv, max(pv * 0.006, 1e-5)) and (("Do not reject" not in verdict) == reject), f"{pv}"


def y12_data_measures(v, ans, level):
    if level == "core":
        data = []
        for i, f in enumerate(v["freq"]):
            data += [(v["edges"][i] + v["edges"][i + 1]) / 2] * f
        N = len(data)
        mean = sum(data) / N
        sd = math.sqrt(sum((x - mean) ** 2 for x in data) / N)
        # Median: walk through the classes.
        run, med = 0, None
        for i, f in enumerate(v["freq"]):
            if run + f >= N / 2:
                med = v["edges"][i] + (N / 2 - run) / f * (v["edges"][i + 1] - v["edges"][i])
                break
            run += f
        g = [float(F(a.split()[0])) for a in ans[:3]]
        return near(g[0], med, 0.0051) and near(g[1], mean, mean * 0.006) and near(g[2], sd, sd * 0.006), f"{med} {mean} {sd}"
    n, sx, sxx = v["n"], v["sx"], v["sxx"]
    mean = F(sx, n)
    sd = math.sqrt(float(F(sxx, n) - mean * mean))
    if level == "foundational":
        out = abs(float(v["test"] - mean)) > 2 * sd
        return F(ans[0].split()[0]) == mean and near(F(ans[1].split()[0]), sd, sd * 0.006) and (("Yes" in ans[2]) == out), f"{mean} {sd}"
    a, b = v["a"], v["b"]
    nums = signed_nums(ans[1])
    return nums[0] == mean * b + a and near(nums[1], sd * b, sd * b * 0.006), f"{mean * b + a} {sd * b}"


def y12_regression(v, ans, level):
    if level == "foundational":
        return signed_nums(ans[1])[0] == q(v["a"]) + q(v["b"]) * v["x1"], "prediction"
    if level == "core":
        b = -q(v["drop"]) / v["step"]
        a = q(v["y1"]) - b * v["x1"]
        return signed_nums(ans[0])[0] == b and signed_nums(ans[1])[0] == a, f"{a} {b}"
    r, c = q(v["r"]), q(v["crit"])
    return (("Do not reject" not in ans[0]) == (abs(r) > c)) and ((">" in ans[0]) == (r > 0)), f"{r} {c}"


def y12_probability(v, ans, level):
    a, b = q(v["pa"]), q(v["pb"])
    if level == "foundational":
        return [F(x) for x in ans] == [a * b, a + b - a * b, (1 - a) * (1 - b)], "rules"
    if level == "core":
        return signed_nums(ans[0])[0] == a * b and signed_nums(ans[1]) == [a * (1 - b), b * (1 - a)] and signed_nums(ans[2])[0] == (1 - a) * (1 - b) and F(ans[3]) == 1 - b * (1 - a), "regions"
    u, d = a + b - a * b, q(v["d"])
    # x + (x + d) − x(x + d) = u by the quadratic formula.
    B, C = -(2 - d), u - d
    disc = B * B - 4 * C
    root = F(math.isqrt(disc.numerator), math.isqrt(disc.denominator))
    x = (-B - root) / 2
    return root * root == disc and signed_nums(ans[1]) == [x, x + d] and x == a, f"{x}"


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
    "num-lcm-problems": num_lcm_problems,
    "num-standard-form": num_standard_form,
    "num-percentage-of-percentage": num_percentage_of_percentage,
    "alg-quadratic-area": alg_quadratic_area,
    "alg-algebraic-proof": alg_algebraic_proof,
    "alg-straight-line": alg_straight_line,
    "geom-transformations": geom_transformations,
    "stats-cumulative-frequency": stats_cumulative_frequency,
    "prob-tree-diagram": prob_tree_diagram,
    "prob-venn-diagram": prob_venn_diagram,
    "num-index-equations": num_index_equations,
    "num-recurring-decimals": num_recurring_decimals,
    "num-counting": num_counting,
    "alg-inequalities": alg_inequalities,
    "alg-formulae": alg_formulae,
    "alg-completing-square": alg_completing_square,
    "geom-volume": geom_volume,
    "geom-sectors": geom_sectors,
    "geom-bearings": geom_bearings,
    "stats-frequency-table": stats_frequency_table,
    "stats-pie-chart": stats_pie_chart,
    "ratio-recipes": ratio_recipes,
    "ratio-inverse-work": ratio_inverse_work,
    "ratio-exchange-rates": ratio_exchange_rates,
    "ratio-parts": ratio_parts,
    "num-profit": num_profit,
    "geom-pressure-density": geom_pressure_density,
    "geom-scales": geom_scales,
    "stats-capture-recapture": stats_capture_recapture,
    "prob-frequency-tree": prob_frequency_tree,
    "alg-travel-graph": alg_travel_graph,
    "alg-circles-lines": alg_circles_lines,
    "alg-iteration": alg_iteration,
    "num-error-intervals": num_error_intervals,
    "num-hcf-problems": num_hcf_problems,
    "stats-scatter-graph": stats_scatter_graph,
    "prob-sample-space": prob_sample_space,
    "alg-shape-expressions": alg_shape_expressions,
    "geom-unit-conversion": geom_unit_conversion,
    "prob-relative-frequency": prob_relative_frequency,
    "num-surds": num_surds,
    "alg-functions": alg_functions,
    "alg-quadratic-sequences": alg_quadratic_sequences,
    "y12-quadratic-roots": y12_quadratic_roots,
    "y12-quadratic-model": y12_quadratic_model,
    "y12-factor-theorem": y12_factor_theorem,
    "y12-binomial": y12_binomial,
    "y12-circle": y12_circle,
    "y12-differentiation": y12_differentiation,
    "y12-first-principles": y12_first_principles,
    "y12-integration": y12_integration,
    "y12-trig-equations": y12_trig_equations,
    "y12-triangles": y12_triangles,
    "y12-exponential-model": y12_exponential_model,
    "y12-logs": y12_logs,
    "y12-vectors": y12_vectors,
    "y12-proof": y12_proof,
    "y13-series": y13_series,
    "y13-general-binomial": y13_general_binomial,
    "y13-partial-fractions": y13_partial_fractions,
    "y13-functions": y13_functions,
    "y13-differentiation": y13_differentiation,
    "y13-implicit-parametric": y13_implicit_parametric,
    "y13-integration": y13_integration,
    "y13-r-form": y13_r_form,
    "y13-numerical": y13_numerical,
    "y13-differential-equations": y13_differential_equations,
    "y13-radians": y13_radians,
    "y13-proof": y13_proof,
    "y13-vectors": y13_vectors,
    "y12-straight-lines": y12_straight_lines,
    "y13-double-angle": y13_double_angle,
    "y13-trapezium": y13_trapezium,
    "y13-connected-rates": y13_connected_rates,
    "y13-small-angles": y13_small_angles,
    "y12-speed-time": y12_speed_time,
    "y12-suvat": y12_suvat,
    "y12-forces-vectors": y12_forces_vectors,
    "y12-connected": y12_connected,
    "y12-variable-acceleration": y12_variable_acceleration,
    "y12-binomial-distribution": y12_binomial_distribution,
    "y12-hypothesis-test": y12_hypothesis_test,
    "y12-data-measures": y12_data_measures,
    "y12-regression": y12_regression,
    "y12-probability": y12_probability,
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
