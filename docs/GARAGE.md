# Garage customization

Open **YOUR GARAGE** before a run or return to it after banking a completed run. Select the car you want to modify at the top. Each car has independent equipment and paint; the inventory and credits belong to the driver.

Use the sticky **Your Build / Boxes / Upgrades** shortcuts to move around the garage. The close button stays available while scrolling.

## See the actual car

The studio uses the same vehicle factories as the driving scene. Drag the car to orbit, scroll to zoom, or choose **Front**, **Rear**, **Wheels**, or **Interior**. **Show fitted** restores the installed build after experimenting. The game world stops rendering behind the open garage, and the studio stops rendering when the garage closes.

Select **Inspect & Compare** on a part. Bronze, Silver, Gold and Diamond buttons preview that grade without spending credits or inventory. Wheels and spoilers are also previewed on the car. The yellow preview label distinguishes a trial fit from saved equipment. Engine, ECU and other concealed components have a studio assembly view; their internal installation is not an exposed engine-bay model.

## Buy, install and compare

The inspector explains the part, displays current and proposed values, and animates the change after installation. Purchase upgrades one tier at a time: **600 / 1,500 / 3,600 / 7,800 CR**. The purchase button names the next tier even if you are inspecting a later one. An owned higher-grade part can be installed directly for free. Replaced parts return to shared inventory under the existing garage rules.

Top speed is the simulation ceiling, not a guaranteed speed on every road. Acceleration/braking are simulation rates. Steering is a response rating; a gain of four points means a rating of 100 becomes 104. Lower damage-received and recovery-delay values are better. Comparisons use the same `upgradedSpec` function as live driving and include the car's other fitted parts. A bar's gray mark shows the old value and its colored section shows the new value.

## Exterior changes

- **Rims:** tier-specific five-, seven-, ten- and split-spoke designs, with Bronze, Silver, Gold or Diamond finishes.
- **Tires:** wider tire sections, different tread density, semi-slicks and Diamond track slicks, plus sidewall quality bands. Rolling radius remains consistent.
- **Brakes:** colored stationary calipers and increasingly drilled discs. Calipers steer with the hub but do not spin with the wheel.
- **Spoiler:** body-mounted feet, progressively taller/wider wings, colored trailing edges/end plates, and a double-element Diamond wing. The Vector keeps its stock wing before upgrading.
- **Paint:** eight free presets and a custom hex color. Paint is saved to the selected car on the server and appears on that car in the next chase. Paint does not change performance or cost credits.

The original 458 keeps its original wheels while stock; fitting wheel, tire or brake upgrades replaces their visible assemblies at the actual source-model hubs. All cars retain their steering shaft, lamp and exhaust positions. Repair and rewind continue to restore damage independently of installed parts.

## Cabins and navigation

The four cars have model-specific instrument styles and trim. Procedural cabins have a genuine opening in the body surface, floor, headliner, door inserts, bolsters, trim and controls; the Vector has a flat-bottom steering rim. The restored 458 retains its licensed interior and gains a fitted instrument binnacle and dark upholstery. Speed/RPM/gear displays use the shared engine telemetry calculation; the steering wheel rotates around its shaft.

In cockpit view, street chevrons are raised and tilted toward the driver and at most 2 metres wide. Nearby guidance fades in between 12 and 24 metres to keep the windshield clear. Hood, chase and aerial views have their own sizes; projected-width limits also keep arrows compact on narrow screens. Brightness flows along the route without size pulsation or bobbing, and route samples follow each moving frame. Chevrons still follow the street route and depth-test against the world. The transparent HUD uses a compact direction arrow, stable-width distance numerals and responsive typography. **C** cycles camera modes.

## Save and compatibility

Paint is an optional `cars[carId].paint` field in the existing saved profile. Old garages need no reset or database migration. The server validates both the car ID and six-digit hex color. The existing version checks, idempotent operations and private garage backup cover paint as well as upgrades. No paid currency, account requirement or new third-party service is introduced.

The 56 part-grade assemblies are original procedural 3D models rendered into cached studio images. Geometry, machining and materials vary by grade; these are illustrative part assemblies, not manufacturer photographs. The existing photographic atlas remains as a fallback when the studio renderer is unavailable. The studio needs WebGL; gameplay requirements are unchanged.

## Platinum (v1.15)

Kutaisi's two secret stunt challenges each award one Platinum box once per profile. Open the separate PLATINUM button to roll three fifth-grade parts; duplicates count separately. All fourteen assemblies have fifth-grade previews. Install an owned part free or sell a spare for 1,400 CR. Regular purchases stop at Diamond and ordinary box odds are unchanged. Platinum contributes 4.5 tier units versus Diamond's 4. Shared upgrades and paint travel between both cities. [Unlock and challenge locations](KUTAISI.md).

## Immediate rewards and fusion stars (1.16)

Level clears reveal the earned three-part box before Garage/Next Level. Equip a stronger part directly, sell a spare, or keep it for fusion. Each installed part has a five-star tuning track, with exact duplicate requirements and total bonuses shown in its card. Stars stay with this car slot when rarity is improved. [Rules, examples and safety limits](FUSION.md).
