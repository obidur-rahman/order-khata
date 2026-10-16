# Data card — D1 intent corpus

- source: `nafiullah/bangla-ecom-voice-decisions` config `intent`
- licence: CC BY-NC-SA 4.0 (non-commercial, attribution required)
- seed: 42

## train (after dedupe) — 5430 rows

```
script             bl   bn   en   mx
cls                                 
complaint         317  313  317   79
delivery_problem  244  231  223   50
order             417  448  464  110
other             470  500  466   74
price_question    213  223  215   56
```

## validation — 794 rows

```
script            bl  bn  en  mx
cls                             
complaint         47  49  51  15
delivery_problem  32  29  31   2
order             73  49  47  21
other             77  73  79  14
price_question    34  35  29   7
```

## test — 806 rows

```
script            bl  bn  en  mx
cls                             
complaint         54  49  47   9
delivery_problem  29  54  40   3
order             64  62  63  13
other             76  64  72   5
price_question    30  35  32   5
```

## Known limitations

- The intent corpus is largely machine-generated; real customer typos, dialects and disfluencies are under-represented.
- Gold intent labels are trusted from the source; the escalate flag and alt_intent are machine-assisted annotations, and escalate reflects a policy, not ground truth.
- Scam training/test data is SMS-style, not shop-chat DMs.
- The in-distribution test set shares a source with the training data; the OOD result is the more conservative number.
- The inbox is simulated; no live Facebook integration.
- Class "Delivery" includes pre-purchase delivery questions.
